import { PrismaClient } from "@prisma/client";
import { ApiError } from "../../core/errors/api-error";

const prisma = new PrismaClient();

type PermissionInput = {
  subject_type: "user" | "role" | "department";
  subject_id: number;
  can_read?: boolean;
  can_edit?: boolean;
  can_approve?: boolean;
  can_share?: boolean;
  can_delete?: boolean;
};

export class PermissionsService {
  async grantPermission(
    documentId: number,
    permission: PermissionInput,
    grantedBy: number,
    tenantId: number
  ) {
    // Verify document belongs to tenant
    const doc = await prisma.documents.findFirst({
      where: { id: documentId, tenant_id: tenantId },
    });
    if (!doc) {
      throw ApiError.notFound("Document not found", "DOCUMENT_NOT_FOUND");
    }

    return prisma.document_permissions.upsert({
      where: {
        document_id_subject_type_subject_id: {
          document_id: documentId,
          subject_type: permission.subject_type,
          subject_id: permission.subject_id,
        },
      },
      update: {
        can_read: permission.can_read ?? true,
        can_edit: permission.can_edit ?? false,
        can_approve: permission.can_approve ?? false,
        can_share: permission.can_share ?? false,
        can_delete: permission.can_delete ?? false,
        granted_by: grantedBy,
        granted_at: new Date(),
      },
      create: {
        document_id: documentId,
        subject_type: permission.subject_type,
        subject_id: permission.subject_id,
        can_read: permission.can_read ?? true,
        can_edit: permission.can_edit ?? false,
        can_approve: permission.can_approve ?? false,
        can_share: permission.can_share ?? false,
        can_delete: permission.can_delete ?? false,
        granted_by: grantedBy,
      },
    });
  }

  async revokePermission(
    documentId: number,
    subjectType: string,
    subjectId: number,
    tenantId: number
  ) {
    // Verify document belongs to tenant
    const doc = await prisma.documents.findFirst({
      where: { id: documentId, tenant_id: tenantId },
    });
    if (!doc) {
      throw ApiError.notFound("Document not found", "DOCUMENT_NOT_FOUND");
    }

    await prisma.document_permissions.delete({
      where: {
        document_id_subject_type_subject_id: {
          document_id: documentId,
          subject_type: subjectType,
          subject_id: subjectId,
        },
      },
    });
  }

  async getDocumentPermissions(documentId: number, tenantId: number) {
    // Verify document belongs to tenant
    const doc = await prisma.documents.findFirst({
      where: { id: documentId, tenant_id: tenantId },
    });
    if (!doc) {
      throw ApiError.notFound("Document not found", "DOCUMENT_NOT_FOUND");
    }

    return prisma.document_permissions.findMany({
      where: { document_id: documentId },
      orderBy: { granted_at: "desc" },
    });
  }

  async checkPermission(
    documentId: number,
    userId: number,
    permission: "read" | "edit" | "approve" | "share" | "delete"
  ): Promise<boolean> {
    // Get user's roles and department
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { department_id: true, role: true },
    });

    if (!user) return false;
    const userRoles = await prisma.user_roles.findMany({
      where: { user_id: userId },
      select: { role_id: true },
    });
    const roleIds = userRoles.map((r) => r.role_id);

    // Check permissions for user, role, or department
    const permissions = await prisma.document_permissions.findMany({
      where: {
        document_id: documentId,
        OR: [
          { subject_type: "user", subject_id: userId },
          ...(roleIds.length ? [{ subject_type: "role", subject_id: { in: roleIds } as any }] : []),
          { subject_type: "department", subject_id: user.department_id || 0 },
        ],
      },
    });

    // Explicit deny has precedence over allow
    const permissionField = `can_${permission}` as keyof typeof permissions[0];
    const hasDeny = permissions.some((p) => p[permissionField] === false);
    if (hasDeny) return false;
    return permissions.some((p) => p[permissionField] === true);
  }
}

export const permissionsService = new PermissionsService();
