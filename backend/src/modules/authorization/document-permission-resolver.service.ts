import { PrismaClient, users } from "@prisma/client";
import { normalizeDocumentTypePolicyV2 } from "../settings/document-type-policy.helper";

const prisma = new PrismaClient();

export type ResolvedDocumentPermissions = {
  canView: boolean;
  canDownload: boolean;
  canEdit: boolean;
  canComment: boolean;
  canApprove: boolean;
  canSign: boolean;
  canShare: boolean;
  canDelete: boolean;
  reasons: string[];
};

type PermissionKey =
  | "canView"
  | "canDownload"
  | "canEdit"
  | "canComment"
  | "canApprove"
  | "canSign"
  | "canShare"
  | "canDelete";

const ALL_PERMISSION_KEYS: PermissionKey[] = [
  "canView",
  "canDownload",
  "canEdit",
  "canComment",
  "canApprove",
  "canSign",
  "canShare",
  "canDelete",
];

const SNAPSHOT_PERMISSION_TO_KEYS: Record<string, PermissionKey[]> = {
  VIEW: ["canView"],
  DOWNLOAD: ["canDownload"],
  EDIT: ["canEdit"],
  COMMENT: ["canComment"],
  APPROVE: ["canApprove"],
  SIGN: ["canSign"],
  SHARE: ["canShare"],
  DELETE: ["canDelete"],
};

function createBlankPermissions(): Omit<ResolvedDocumentPermissions, "reasons"> {
  return {
    canView: false,
    canDownload: false,
    canEdit: false,
    canComment: false,
    canApprove: false,
    canSign: false,
    canShare: false,
    canDelete: false,
  };
}

class DocumentPermissionResolverService {
  private normalizePermissionArray(value: unknown): string[] {
    return Array.isArray(value)
      ? Array.from(new Set(value.map((item) => String(item || "").trim().toUpperCase()).filter(Boolean)))
      : [];
  }

  private deriveSnapshotPermissions(policy: {
    permissions_json?: unknown;
    can_read: boolean;
    can_edit: boolean;
    can_approve: boolean;
    can_share: boolean;
    can_delete: boolean;
  }) {
    const fromJson = this.normalizePermissionArray(policy.permissions_json);
    if (fromJson.length > 0) {
      return fromJson;
    }

    const legacy: string[] = [];
    if (policy.can_read) legacy.push("VIEW", "DOWNLOAD");
    if (policy.can_edit) legacy.push("EDIT");
    if (policy.can_approve) legacy.push("APPROVE");
    if (policy.can_share) legacy.push("SHARE");
    if (policy.can_delete) legacy.push("DELETE");
    return Array.from(new Set(legacy));
  }

  private matchesStatusLimit(statusLimitJson: unknown, currentStatus: string) {
    const statusLimit = this.normalizePermissionArray(statusLimitJson);
    if (statusLimit.length === 0) return true;
    return statusLimit.includes(currentStatus);
  }

  private isEffectiveDeny(
    permissionSource: string | null | undefined,
    permissionName: "read" | "edit" | "approve" | "share" | "delete"
  ) {
    if ((permissionSource || "baseline") !== "baseline") {
      return true;
    }

    return permissionName === "read";
  }

  private getUserRank(user: users & { position?: { level: number | null } | null }): number {
    return user.position?.level ?? 0;
  }

  private setAllowed(target: Omit<ResolvedDocumentPermissions, "reasons">, key: PermissionKey) {
    target[key] = true;
  }

  private applyDeny(target: Omit<ResolvedDocumentPermissions, "reasons">, key: PermissionKey) {
    target[key] = true;
  }

  private getSecurityLevelRank(level: string | null | undefined): number {
    const normalized = String(level || "normal").toLowerCase();
    if (normalized === "internal") return 1;
    if (normalized === "confidential") return 2;
    if (normalized === "secret") return 4;
    if (normalized === "top_secret") return 6;
    return 0;
  }

  private passSecurityLevel(
    securityLevel: string | null | undefined,
    user: users & { position?: { level: number | null } | null },
    isOwner: boolean,
    isSuperAdmin: boolean
  ) {
    if (isOwner || isSuperAdmin) return true;
    const requiredRank = this.getSecurityLevelRank(securityLevel);
    return this.getUserRank(user) >= requiredRank;
  }

  private async getDocumentTypePolicy(tenantId: number, documentTypeId: number | null) {
    if (!documentTypeId) return null;
    const setting = await prisma.tenant_settings.findFirst({
      where: {
        tenant_id: tenantId,
        setting_key: `doc_type_policy:${documentTypeId}`,
      },
      select: { setting_value: true },
    });
    if (!setting?.setting_value) return null;
    return normalizeDocumentTypePolicyV2(setting.setting_value);
  }

  private matchesVisibilityScope(
    visibilityScope: string | null | undefined,
    user: users,
    document: { department_id: number | null; owner_id: number | null },
    creatorManagerId: number | null,
    departmentManagerId: number | null
  ) {
    const normalized = String(visibilityScope || "company").toLowerCase();

    if (normalized === "company" || normalized === "public") {
      return { allowed: true, reason: "Matched visibility scope: COMPANY" };
    }
    if (normalized === "department") {
      const allowed = !!document.department_id && !!user.department_id && document.department_id === user.department_id;
      return {
        allowed,
        reason: allowed
          ? "Matched visibility scope: DEPARTMENT"
          : "Visibility scope DEPARTMENT does not match user department",
      };
    }
    if (normalized === "department_and_manager") {
      const sameDepartment =
        !!document.department_id && !!user.department_id && document.department_id === user.department_id;
      const isCreatorManager = !!creatorManagerId && creatorManagerId === user.id;
      const isDepartmentManager = !!departmentManagerId && departmentManagerId === user.id;
      const allowed = sameDepartment || isCreatorManager || isDepartmentManager;
      return {
        allowed,
        reason: allowed
          ? "Matched visibility scope: DEPARTMENT_AND_MANAGER"
          : "Visibility scope DEPARTMENT_AND_MANAGER not matched",
      };
    }
    if (normalized === "creator_only") {
      const allowed = document.owner_id === user.id;
      return {
        allowed,
        reason: allowed
          ? "Matched visibility scope: CREATOR_ONLY"
          : "Visibility scope CREATOR_ONLY denies current user",
      };
    }
    if (normalized === "workflow_only") {
      return {
        allowed: false,
        reason: "Visibility scope WORKFLOW_ONLY requires workflow participation",
      };
    }
    if (normalized === "custom_acl" || normalized === "private") {
      return {
        allowed: false,
        reason: `Visibility scope ${normalized.toUpperCase()} requires explicit permission`,
      };
    }

    return { allowed: false, reason: `Unknown visibility scope: ${normalized}` };
  }

  private async getWorkflowParticipation(userId: number, userEmail: string, documentId: number) {
    const [approval, signer, cc] = await Promise.all([
      prisma.document_approvals.findFirst({
        where: { document_id: documentId, approver_user_id: userId },
        select: { id: true, action: true },
      }),
      prisma.signers.findFirst({
        where: {
          sign_request: { document_id: documentId },
          OR: [{ user_id: userId }, { email: userEmail }],
        },
        select: { id: true, status: true },
      }),
      prisma.document_cc_emails.findFirst({
        where: { document_id: documentId, email: userEmail },
        select: { id: true },
      }),
    ]);

    return {
      isParticipant: !!approval || !!signer || !!cc,
      isApprover: !!approval,
      isSigner: !!signer,
      isCc: !!cc,
    };
  }

  private async resolveAclSnapshotPermissions(
    documentId: number,
    user: users & { user_roles?: Array<{ role_id: number }> | undefined },
    currentStatus: string
  ) {
    const roleIds = user.user_roles?.map((item) => item.role_id) || [];
    const candidates = [
      { subject_type: "user", subject_id: user.id },
      ...(user.department_id ? [{ subject_type: "department", subject_id: user.department_id }] : []),
      ...(user.position_id && user.department_id
        ? [
            {
              subject_type: "position_in_department",
              subject_id: user.position_id,
              scope_department_id: user.department_id,
            },
          ]
        : []),
      ...roleIds.map((roleId) => ({ subject_type: "role", subject_id: roleId })),
    ];

    const policies = await prisma.document_permissions.findMany({
      where: {
        document_id: documentId,
        OR: candidates,
      },
    });

    const allow = createBlankPermissions();
    const deny = createBlankPermissions();
    const reasons: string[] = [];

    for (const policy of policies) {
      const subjectLabel = `${policy.subject_type}:${policy.subject_id}`;
      if (!this.matchesStatusLimit(policy.status_limit_json, currentStatus)) {
        reasons.push(`ACL snapshot skipped for ${subjectLabel} because status ${currentStatus} is out of scope`);
        continue;
      }

      const snapshotPermissions = this.deriveSnapshotPermissions(policy);
      for (const permission of snapshotPermissions) {
        const keys = SNAPSHOT_PERMISSION_TO_KEYS[permission] || [];
        for (const key of keys) {
          allow[key] = true;
        }
        reasons.push(`Matched ACL snapshot ${permission} for ${subjectLabel}`);
      }

      if (policy.can_read === false) {
        deny.canView = true;
        deny.canDownload = true;
        reasons.push(`ACL snapshot denied VIEW/DOWNLOAD for ${subjectLabel}`);
      }
      if (policy.can_edit === false && this.isEffectiveDeny(policy.permission_source, "edit")) {
        deny.canEdit = true;
        reasons.push(`ACL snapshot denied EDIT for ${subjectLabel}`);
      }
      if (policy.can_approve === true) {
        allow.canApprove = true;
        reasons.push(`Matched ACL snapshot APPROVE for ${subjectLabel}`);
      }
      if (policy.can_approve === false && this.isEffectiveDeny(policy.permission_source, "approve")) {
        deny.canApprove = true;
        reasons.push(`ACL snapshot denied APPROVE for ${subjectLabel}`);
      }
      if (policy.can_share === true) {
        allow.canShare = true;
        reasons.push(`Matched ACL snapshot SHARE for ${subjectLabel}`);
      }
      if (policy.can_share === false && this.isEffectiveDeny(policy.permission_source, "share")) {
        deny.canShare = true;
        reasons.push(`ACL snapshot denied SHARE for ${subjectLabel}`);
      }
      if (policy.can_delete === true) {
        allow.canDelete = true;
        reasons.push(`Matched ACL snapshot DELETE for ${subjectLabel}`);
      }
      if (policy.can_delete === false && this.isEffectiveDeny(policy.permission_source, "delete")) {
        deny.canDelete = true;
        reasons.push(`ACL snapshot denied DELETE for ${subjectLabel}`);
      }
    }

    return { allow, deny, reasons };
  }

  private applyAdvancedPolicyPermission(
    target: Omit<ResolvedDocumentPermissions, "reasons">,
    permissionKey: string,
    effect: "ALLOW" | "DENY"
  ) {
    const normalized = permissionKey.trim();
    const permissionMap: Record<string, PermissionKey[]> = {
      VIEW: ["canView"],
      DOWNLOAD: ["canDownload"],
      EDIT: ["canEdit"],
      COMMENT: ["canComment"],
      APPROVE: ["canApprove"],
      SIGN: ["canSign"],
      SHARE: ["canShare"],
      DELETE: ["canDelete"],
    };
    const keys = permissionMap[normalized] || [];
    for (const key of keys) {
      if (effect === "ALLOW") {
        this.setAllowed(target, key);
      } else {
        this.applyDeny(target, key);
      }
    }
  }

  private matchesAdvancedCondition(
    condition: Record<string, unknown>,
    context: {
      document: { confidential_level: string | null; status: string | null };
      documentDepartmentCode?: string | null;
    }
  ) {
    if (condition.security_level) {
      const expected = String(condition.security_level).toLowerCase();
      if (String(context.document.confidential_level || "").toLowerCase() !== expected) return false;
    }

    if (Array.isArray(condition.status) && condition.status.length > 0) {
      const allowedStatuses = condition.status.map((item) => String(item).toUpperCase());
      if (!allowedStatuses.includes(String(context.document.status || "").toUpperCase())) return false;
    }

    if (Array.isArray(condition.department) && condition.department.length > 0) {
      const allowedDepartments = condition.department.map((item) => String(item).toUpperCase());
      if (!context.documentDepartmentCode || !allowedDepartments.includes(String(context.documentDepartmentCode).toUpperCase())) {
        return false;
      }
    }

    return true;
  }

  async resolveDocumentPermission(
    userId: number,
    tenantId: number,
    documentId: number
  ): Promise<ResolvedDocumentPermissions> {
    const reasons: string[] = [];
    const resolved = createBlankPermissions();
    const deny = createBlankPermissions();

    const user = await prisma.users.findUnique({
      where: { id: userId },
      include: {
        position: true,
        user_roles: true,
      },
    });

    if (!user || user.tenant_id !== tenantId) {
      return { ...resolved, reasons: ["USER_NOT_FOUND_OR_TENANT_MISMATCH"] };
    }

    const document = await prisma.documents.findFirst({
      where: { id: documentId, tenant_id: tenantId },
      include: {
        department: { select: { id: true, code: true, manager_id: true } },
        owner: { select: { id: true, manager_id: true, department_id: true } },
      },
    });

    if (!document) {
      return { ...resolved, reasons: ["DOCUMENT_NOT_FOUND"] };
    }

    const isSuperAdmin = user.role === "super_admin";
    const isOwner = document.owner_id === userId;

    if (isSuperAdmin) {
      reasons.push("Super Admin granted full access");
      return {
        canView: true,
        canDownload: true,
        canEdit: true,
        canComment: true,
        canApprove: true,
        canSign: true,
        canShare: true,
        canDelete: true,
        reasons,
      };
    }

    const typePolicy = await this.getDocumentTypePolicy(tenantId, document.document_type_id);
    const workflowParticipation = await this.getWorkflowParticipation(userId, user.email, documentId);
    const currentStatus = String(document.status || "").toUpperCase();
    const aclSnapshot = await this.resolveAclSnapshotPermissions(documentId, user, currentStatus);

    const visibilityDecision = this.matchesVisibilityScope(
      document.visibility_scope,
      user,
      document,
      document.owner?.manager_id ?? null,
      document.department?.manager_id ?? null
    );

    if (visibilityDecision.allowed) {
      resolved.canView = true;
      resolved.canDownload = true;
      reasons.push(visibilityDecision.reason);
    } else {
      reasons.push(visibilityDecision.reason);
    }

    if (isOwner) {
      resolved.canView = true;
      resolved.canDownload = true;
      resolved.canEdit = true;
      resolved.canComment = true;
      resolved.canShare = true;
      resolved.canDelete = true;
      reasons.push("Creator matched");
    }

    if (workflowParticipation.isParticipant) {
      resolved.canView = true;
      resolved.canDownload = true;
      resolved.canComment = true;
      reasons.push("User is workflow participant");
    }

    if (workflowParticipation.isApprover) {
      resolved.canApprove = true;
      reasons.push("User is approver");
    }

    if (workflowParticipation.isSigner) {
      resolved.canSign = true;
      reasons.push("User is signer");
    }

    ALL_PERMISSION_KEYS.forEach((key) => {
      if (aclSnapshot.allow[key]) {
        resolved[key] = true;
      }
      if (aclSnapshot.deny[key]) {
        deny[key] = true;
      }
    });
    reasons.push(...aclSnapshot.reasons);

    if (!this.passSecurityLevel(document.confidential_level, user, isOwner, false)) {
      deny.canView = true;
      deny.canDownload = true;
      reasons.push("Security level denied document view");
    } else {
      reasons.push("Security level check passed");
    }

    if (typePolicy?.legacy_rules.min_position_level && this.getUserRank(user) < typePolicy.legacy_rules.min_position_level) {
      deny.canView = true;
      deny.canDownload = true;
      reasons.push("Legacy min position level denied access");
    }

    if (typePolicy?.legacy_rules.deny_departments?.includes(user.department_id || 0)) {
      deny.canView = true;
      deny.canDownload = true;
      reasons.push("Legacy deny department matched");
    }

    if (typePolicy?.legacy_rules.allow_departments?.length) {
      const matched = !!user.department_id && typePolicy.legacy_rules.allow_departments.includes(user.department_id);
      if (!matched) {
        deny.canView = true;
        deny.canDownload = true;
        reasons.push("Legacy allow department did not match");
      } else {
        reasons.push("Legacy allow department matched");
      }
    }

    if (typePolicy?.advanced_policies?.length) {
      const sortedPolicies = [...typePolicy.advanced_policies]
        .filter((policy) => policy.is_active)
        .sort((a, b) => a.priority - b.priority);

      for (const policy of sortedPolicies) {
        if (
          !this.matchesAdvancedCondition(policy.condition_json, {
            document,
            documentDepartmentCode: document.department?.code,
          })
        ) {
          continue;
        }

        reasons.push(`Advanced policy matched: ${policy.name}`);
        const permissionKeys = Array.isArray((policy.permission_json as any)?.permissions)
          ? (policy.permission_json as any).permissions.map((item: unknown) => String(item).toUpperCase())
          : Object.entries(policy.permission_json || {})
              .filter(([, value]) => value === true)
              .map(([key]) => key.toUpperCase());

        for (const permissionKey of permissionKeys) {
          this.applyAdvancedPolicyPermission(
            policy.effect === "ALLOW" ? resolved : deny,
            permissionKey,
            policy.effect
          );
        }
      }
    }

    const status = currentStatus;
    if (isOwner && !["DRAFT", "REJECTED"].includes(status)) {
      if (resolved.canEdit) {
        resolved.canEdit = false;
        reasons.push("Edit denied because creator can only edit in DRAFT or REJECTED");
      }
      if (resolved.canDelete) {
        resolved.canDelete = false;
        reasons.push("Delete denied because creator can only delete in DRAFT or REJECTED");
      }
    }

    if (["COMPLETED", "ARCHIVED"].includes(status) && !isOwner) {
      if (resolved.canEdit) {
        resolved.canEdit = false;
        reasons.push(`Edit denied because document status is ${status}`);
      }
      if (resolved.canDelete) {
        resolved.canDelete = false;
        reasons.push(`Delete denied because document status is ${status}`);
      }
    }

    if (!workflowParticipation.isApprover && resolved.canApprove) {
      resolved.canApprove = false;
      reasons.push("Approve denied because user is not active approver");
    }

    if (!workflowParticipation.isSigner && resolved.canSign) {
      resolved.canSign = false;
      reasons.push("Sign denied because user is not active signer");
    }

    for (const key of ALL_PERMISSION_KEYS) {
      if (deny[key]) {
        resolved[key] = false;
      }
    }

    if (resolved.canDownload && !resolved.canView) {
      resolved.canDownload = false;
      reasons.push("Download denied because view is not allowed");
    }

    return { ...resolved, reasons };
  }
}

export const documentPermissionResolverService = new DocumentPermissionResolverService();
