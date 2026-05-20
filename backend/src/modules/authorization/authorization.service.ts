import { PrismaClient, documents, users } from "@prisma/client";
import { rolesService } from "../roles/roles.service";

const prisma = new PrismaClient();

export type DocumentAction = "read" | "edit" | "approve" | "share" | "delete";

export interface AuthorizationDecision {
  allowed: boolean;
  reasons: string[];
  deniedBy?: string;
}

type DocumentTypePolicy = {
  allow_roles?: string[];
  deny_roles?: string[];
  allow_departments?: number[];
  deny_departments?: number[];
  min_position_level?: number;
  default_visibility_scope?: string;
  default_confidential_level?: string;
  inherit_creator_department?: boolean;
  force_private_until_completed?: boolean;
};

class AuthorizationService {
  private getUserRank(user: users & { position?: { level: number | null } | null }): number {
    return user.position?.level ?? 0;
  }

  async canAccessDocument(
    userId: number,
    tenantId: number,
    documentId: number,
    action: DocumentAction
  ): Promise<AuthorizationDecision> {
    const reasons: string[] = [];
    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        position: true,
        user_roles: { include: { role: true } },
      },
    });
    if (!user) {
      return { allowed: false, reasons: ["USER_NOT_FOUND"], deniedBy: "layer-1-tenant" };
    }
    if (user.tenant_id !== tenantId) {
      return { allowed: false, reasons: ["TENANT_MISMATCH"], deniedBy: "layer-1-tenant" };
    }

    const doc = await prisma.documents.findFirst({
      where: { id: documentId, tenant_id: tenantId },
      include: {
        document_type: true,
      },
    });
    if (!doc) {
      return { allowed: false, reasons: ["DOCUMENT_NOT_FOUND"], deniedBy: "layer-1-tenant" };
    }

    const rbacAction = action === "edit" ? "update" : action;
    const hasModulePermission = await rolesService.checkPermission(userId, "documents", rbacAction);
    if (!hasModulePermission) {
      return { allowed: false, reasons: ["MISSING_MODULE_PERMISSION"], deniedBy: "layer-2-rbac" };
    }
    reasons.push("RBAC_OK");

    const isOwner = doc.owner_id === userId;
    const isSuperAdmin = user.role === "super_admin";
    const roleNames = user.user_roles.map((ur) => ur.role.name);
    const isParticipant = await this.isWorkflowParticipant(userId, user.email, documentId);

    // Explicit document ACL with deny precedence
    const acl = await this.resolveDocumentAcl(doc.id, user, action);
    if (acl.explicitDeny) {
      return { allowed: false, reasons: [...reasons, "EXPLICIT_DENY"], deniedBy: "layer-10-explicit-deny" };
    }
    if (acl.explicitAllow) {
      reasons.push("EXPLICIT_ALLOW");
    }

    // Confidential + position policy
    if (!this.passConfidentialPolicy(doc, user, isOwner, isSuperAdmin)) {
      return { allowed: false, reasons: [...reasons, "CONFIDENTIAL_POLICY_DENY"], deniedBy: "layer-8-confidential" };
    }
    reasons.push("CONFIDENTIAL_POLICY_OK");

    // Document type policy (tenant-configured)
    const typePolicy = await this.getDocumentTypePolicy(tenantId, doc.document_type_id || null);
    if (typePolicy) {
      const typeDecision = this.evaluateDocumentTypePolicy(typePolicy, roleNames, user.department_id, this.getUserRank(user));
      if (!typeDecision.allowed) {
        return {
          allowed: false,
          reasons: [...reasons, ...typeDecision.reasons],
          deniedBy: "layer-5-document-type",
        };
      }
      reasons.push(...typeDecision.reasons);
    }

    // Status-based restriction for mutating actions
    if (["edit", "delete", "share"].includes(action)) {
      const status = (doc.status || "").toLowerCase();
      if (["completed", "archived"].includes(status) && !isOwner && !isSuperAdmin) {
        return { allowed: false, reasons: [...reasons, "STATUS_RESTRICTED"], deniedBy: "layer-9-status" };
      }
    }
    reasons.push("STATUS_POLICY_OK");

    // Resource-level policy: owner/admin/participant/explicit allow
    const allowByPolicy =
      isOwner ||
      isSuperAdmin ||
      acl.explicitAllow ||
      (action === "read" && (isParticipant || this.passVisibilityScopePolicy(doc, user)));

    if (!allowByPolicy) {
      return {
        allowed: false,
        reasons: [...reasons, "RESOURCE_POLICY_DENY"],
        deniedBy: "layer-3-resource",
      };
    }

    return { allowed: true, reasons: [...reasons, "RESOURCE_POLICY_ALLOW"] };
  }

  async canAccessDocumentWithAudit(
    userId: number,
    tenantId: number,
    documentId: number,
    action: DocumentAction
  ): Promise<AuthorizationDecision> {
    const decision = await this.canAccessDocument(userId, tenantId, documentId, action);
    try {
      await prisma.audit_logs.create({
        data: {
          document_id: documentId,
          event: `authz.document.${action}.${decision.allowed ? "allow" : "deny"}`,
          user_id: userId,
          ip: null,
          ua: JSON.stringify({
            reasons: decision.reasons,
            deniedBy: decision.deniedBy ?? null,
          }),
        },
      });
    } catch {
      // best-effort logging
    }
    return decision;
  }

  private async resolveDocumentAcl(
    documentId: number,
    user: users,
    action: DocumentAction
  ): Promise<{ explicitAllow: boolean; explicitDeny: boolean }> {
    const permissionField = `can_${action === "edit" ? "edit" : action}` as
      | "can_read"
      | "can_edit"
      | "can_approve"
      | "can_share"
      | "can_delete";

    const roleIds = await prisma.user_roles.findMany({
      where: { user_id: user.id },
      select: { role_id: true },
    });

    const subjectCandidates = [
      { subject_type: "user", subject_id: user.id },
      ...(user.department_id ? [{ subject_type: "department", subject_id: user.department_id }] : []),
      ...(user.position_id ? [{ subject_type: "position", subject_id: user.position_id }] : []),
      ...roleIds.map((r) => ({ subject_type: "role", subject_id: r.role_id })),
    ];

    const policies = await prisma.document_permissions.findMany({
      where: {
        document_id: documentId,
        OR: subjectCandidates,
      },
    });

    let explicitAllow = false;
    let explicitDeny = false;
    for (const p of policies) {
      if (p[permissionField] === true) explicitAllow = true;
      if (p[permissionField] === false) explicitDeny = true;
    }
    return { explicitAllow, explicitDeny };
  }

  private async isWorkflowParticipant(userId: number, userEmail: string, documentId: number): Promise<boolean> {
    const [approval, signer, cc] = await Promise.all([
      prisma.document_approvals.findFirst({
        where: { document_id: documentId, approver_user_id: userId },
        select: { id: true },
      }),
      prisma.signers.findFirst({
        where: {
          sign_request: { document_id: documentId },
          OR: [{ user_id: userId }, { email: userEmail }],
        },
        select: { id: true },
      }),
      prisma.document_cc_emails.findFirst({
        where: { document_id: documentId, email: userEmail },
        select: { id: true },
      }),
    ]);
    return !!approval || !!signer || !!cc;
  }

  private passVisibilityScopePolicy(doc: documents, user: users): boolean {
    const scope = (doc.visibility_scope || "public").toLowerCase();
    if (scope === "private") return false;
    if (scope === "department") {
      if (!doc.department_id || !user.department_id) return false;
      return doc.department_id === user.department_id;
    }
    return true;
  }

  private passConfidentialPolicy(
    doc: documents,
    user: users & { position?: { level: number | null } | null },
    isOwner: boolean,
    isSuperAdmin: boolean
  ): boolean {
    if (isOwner || isSuperAdmin) return true;
    const level = (doc.confidential_level || "normal").toLowerCase();
    const rank = this.getUserRank(user);

    // Product-grade baseline mapping:
    // normal/public: everyone with resource allow
    // confidential: rank >= 2
    // secret: rank >= 4
    // top_secret: rank >= 6
    if (level === "normal") return true;
    if (level === "confidential") return rank >= 2;
    if (level === "secret") return rank >= 4;
    if (level === "top_secret") return rank >= 6;
    return false;
  }

  private async getDocumentTypePolicy(tenantId: number, documentTypeId: number | null): Promise<DocumentTypePolicy | null> {
    if (!documentTypeId) return null;
    const setting = await prisma.tenant_settings.findFirst({
      where: {
        tenant_id: tenantId,
        setting_key: `doc_type_policy:${documentTypeId}`,
      },
      select: { setting_value: true },
    });
    if (!setting || !setting.setting_value) return null;
    return setting.setting_value as unknown as DocumentTypePolicy;
  }

  private evaluateDocumentTypePolicy(
    policy: DocumentTypePolicy,
    roleNames: string[],
    departmentId: number | null,
    rank: number
  ): AuthorizationDecision {
    const reasons: string[] = [];

    if (policy.deny_roles?.some((r) => roleNames.includes(r))) {
      return { allowed: false, reasons: ["DOC_TYPE_DENY_ROLE"] };
    }
    if (departmentId && policy.deny_departments?.includes(departmentId)) {
      return { allowed: false, reasons: ["DOC_TYPE_DENY_DEPARTMENT"] };
    }

    if (typeof policy.min_position_level === "number" && rank < policy.min_position_level) {
      return { allowed: false, reasons: ["DOC_TYPE_MIN_RANK_NOT_MET"] };
    }

    if (policy.allow_roles?.length) {
      const ok = policy.allow_roles.some((r) => roleNames.includes(r));
      if (!ok) return { allowed: false, reasons: ["DOC_TYPE_ALLOW_ROLE_REQUIRED"] };
      reasons.push("DOC_TYPE_ALLOW_ROLE_MATCH");
    }

    if (policy.allow_departments?.length) {
      const ok = !!departmentId && policy.allow_departments.includes(departmentId);
      if (!ok) return { allowed: false, reasons: ["DOC_TYPE_ALLOW_DEPARTMENT_REQUIRED"] };
      reasons.push("DOC_TYPE_ALLOW_DEPARTMENT_MATCH");
    }

    reasons.push("DOC_TYPE_POLICY_OK");
    return { allowed: true, reasons };
  }
}

export const authorizationService = new AuthorizationService();
