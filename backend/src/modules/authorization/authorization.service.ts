import { prisma } from "../../config/prisma";
import { rolesService } from "../roles/roles.service";
import { documentPermissionResolverService } from "./document-permission-resolver.service";


export type DocumentAction = "read" | "edit" | "approve" | "share" | "delete";

export interface AuthorizationDecision {
  allowed: boolean;
  reasons: string[];
  deniedBy?: string;
}

const actionToPermissionKey: Record<DocumentAction, keyof Omit<ReturnType<typeof createBlankPermissionMap>, "reasons">> = {
  read: "canView",
  edit: "canEdit",
  approve: "canApprove",
  share: "canShare",
  delete: "canDelete",
};

function createBlankPermissionMap() {
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

class AuthorizationService {
  async canAccessDocument(
    userId: number,
    tenantId: number,
    documentId: number,
    action: DocumentAction
  ): Promise<AuthorizationDecision> {
    const reasons: string[] = [];

    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, tenant_id: true },
    });

    if (!user) {
      return { allowed: false, reasons: ["USER_NOT_FOUND"], deniedBy: "layer-1-tenant" };
    }

    if (user.tenant_id !== tenantId) {
      return { allowed: false, reasons: ["TENANT_MISMATCH"], deniedBy: "layer-1-tenant" };
    }

    const document = await prisma.documents.findFirst({
      where: { id: documentId, tenant_id: tenantId },
      select: { id: true },
    });

    if (!document) {
      return { allowed: false, reasons: ["DOCUMENT_NOT_FOUND"], deniedBy: "layer-1-tenant" };
    }

    const rbacAction = action === "edit" ? "update" : action;
    const hasModulePermission = await rolesService.checkPermission(userId, "documents", rbacAction);
    if (!hasModulePermission) {
      return { allowed: false, reasons: ["MISSING_MODULE_PERMISSION"], deniedBy: "layer-2-rbac" };
    }
    reasons.push("RBAC_OK");

    const resolved = await documentPermissionResolverService.resolveDocumentPermission(
      userId,
      tenantId,
      documentId
    );

    const key = actionToPermissionKey[action];
    const allowed = resolved[key];

    if (!allowed) {
      return {
        allowed: false,
        reasons: [...reasons, ...resolved.reasons],
        deniedBy: "layer-3-document-resolver",
      };
    }

    return {
      allowed: true,
      reasons: [...reasons, ...resolved.reasons],
    };
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
      // best effort
    }
    return decision;
  }

  async resolveDocumentPermission(userId: number, tenantId: number, documentId: number) {
    return documentPermissionResolverService.resolveDocumentPermission(userId, tenantId, documentId);
  }
}

export const authorizationService = new AuthorizationService();

