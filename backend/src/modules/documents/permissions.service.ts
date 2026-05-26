import { PrismaClient } from "@prisma/client";
import { ApiError } from "../../core/errors/api-error";

const prisma = new PrismaClient();

type PermissionInput = {
  permission_source?: "share" | "baseline";
  subject_type: "user" | "department" | "position_in_department" | "role";
  subject_id: number;
  scope_department_id?: number;
  scope?: string;
  permissions_json?: string[] | null;
  status_limit_json?: string[] | null;
  can_read?: boolean;
  can_edit?: boolean;
  can_approve?: boolean;
  can_share?: boolean;
  can_delete?: boolean;
};

export class PermissionsService {
  private normalizePermissionArray(value: unknown): string[] {
    return Array.isArray(value)
      ? Array.from(new Set(value.map((item) => String(item || "").trim().toUpperCase()).filter(Boolean)))
      : [];
  }

  private isEffectiveDeny(
    permissionSource: string | null | undefined,
    permission: "read" | "edit" | "approve" | "share" | "delete"
  ) {
    if ((permissionSource || "baseline") !== "baseline") {
      return true;
    }

    return permission === "read";
  }

  private async validatePermissionSubject(
    tenantId: number,
    permission: PermissionInput,
  ): Promise<{ normalizedScopeDepartmentId: number }> {
    if (permission.subject_type === "user") {
      const user = await prisma.users.findFirst({
        where: { id: permission.subject_id, tenant_id: tenantId },
        select: { id: true },
      });
      if (!user) {
        throw ApiError.notFound("User not found", "USER_NOT_FOUND");
      }
      return { normalizedScopeDepartmentId: 0 };
    }

    if (permission.subject_type === "department") {
      const department = await prisma.departments.findFirst({
        where: { id: permission.subject_id, tenant_id: tenantId },
        select: { id: true },
      });
      if (!department) {
        throw ApiError.notFound("Department not found", "DEPARTMENT_NOT_FOUND");
      }
      return { normalizedScopeDepartmentId: 0 };
    }

    if (permission.subject_type === "position_in_department") {
      if (!permission.scope_department_id) {
        throw ApiError.badRequest("scope_department_id is required", "SCOPE_DEPARTMENT_REQUIRED");
      }

      const [position, department] = await Promise.all([
        prisma.positions.findFirst({
          where: { id: permission.subject_id, tenant_id: tenantId },
          select: { id: true },
        }),
        prisma.departments.findFirst({
          where: { id: permission.scope_department_id, tenant_id: tenantId },
          select: { id: true },
        }),
      ]);

      if (!position) {
        throw ApiError.notFound("Position not found", "POSITION_NOT_FOUND");
      }
      if (!department) {
        throw ApiError.notFound("Department not found", "DEPARTMENT_NOT_FOUND");
      }

      return { normalizedScopeDepartmentId: permission.scope_department_id };
    }

    if (permission.subject_type === "role") {
      const role = await prisma.roles.findFirst({
        where: { id: permission.subject_id, tenant_id: tenantId },
        select: { id: true },
      });
      if (!role) {
        throw ApiError.notFound("Role not found", "ROLE_NOT_FOUND");
      }
      return { normalizedScopeDepartmentId: 0 };
    }

    throw ApiError.badRequest("Unsupported subject_type", "UNSUPPORTED_SUBJECT_TYPE");
  }

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

    const permissionSource = permission.permission_source ?? "baseline";
    if (permissionSource === "share" && (doc.status || "").toLowerCase() !== "completed") {
      throw ApiError.badRequest(
        "Share permissions can only be granted after the document is completed",
        "DOCUMENT_NOT_COMPLETED_FOR_SHARE"
      );
    }
    const { normalizedScopeDepartmentId } = await this.validatePermissionSubject(tenantId, permission);

    return prisma.document_permissions.upsert({
      where: {
        document_permissions_lookup_key: {
          document_id: documentId,
          permission_source: permissionSource,
          subject_type: permission.subject_type,
          subject_id: permission.subject_id,
          scope_department_id: normalizedScopeDepartmentId,
        },
      },
      update: {
        permission_source: permissionSource,
        scope_department_id: normalizedScopeDepartmentId,
        scope: permission.scope ?? null,
        permissions_json: permission.permissions_json ?? null,
        status_limit_json: permission.status_limit_json ?? null,
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
        permission_source: permissionSource,
        subject_type: permission.subject_type,
        subject_id: permission.subject_id,
        scope_department_id: normalizedScopeDepartmentId,
        scope: permission.scope ?? null,
        permissions_json: permission.permissions_json ?? null,
        status_limit_json: permission.status_limit_json ?? null,
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
    permissionSource: string,
    scopeDepartmentId: number | undefined,
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
        document_permissions_lookup_key: {
          document_id: documentId,
          permission_source: permissionSource,
          subject_type: subjectType,
          subject_id: subjectId,
          scope_department_id: scopeDepartmentId ?? 0,
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
      select: { department_id: true, position_id: true, role: true },
    });

    if (!user) return false;
    const userRoles = await prisma.user_roles.findMany({
      where: { user_id: userId },
      select: { role_id: true },
    });
    const roleIds = userRoles.map((r) => r.role_id);

    // Check permissions for user, role, or department
    const document = await prisma.documents.findUnique({
      where: { id: documentId },
      select: { status: true },
    });
    if (!document) return false;
    const currentStatus = String(document.status || "").toUpperCase();

    const permissions = await prisma.document_permissions.findMany({
      where: {
        document_id: documentId,
        OR: [
          { subject_type: "user", subject_id: userId },
          ...(roleIds.length ? [{ subject_type: "role", subject_id: { in: roleIds } as any }] : []),
          { subject_type: "department", subject_id: user.department_id || 0 },
          ...(user.position_id && user.department_id ? [{
            subject_type: "position_in_department",
            subject_id: user.position_id,
            scope_department_id: user.department_id,
          }] : []),
        ],
      },
    });

    const permissionNameMap: Record<typeof permission, string[]> = {
      read: ["VIEW", "DOWNLOAD"],
      edit: ["EDIT"],
      approve: ["APPROVE"],
      share: ["SHARE"],
      delete: ["DELETE"],
    };

    const permissionField = `can_${permission}` as keyof typeof permissions[0];
    const effectivePermissions = permissions.filter((item) => {
      const statusLimit = this.normalizePermissionArray(item.status_limit_json);
      if (statusLimit.length > 0 && !statusLimit.includes(currentStatus)) {
        return false;
      }
      return true;
    });

    const hasDeny = effectivePermissions.some(
      (p) => p[permissionField] === false && this.isEffectiveDeny(p.permission_source, permission)
    );
    if (hasDeny) return false;

    return effectivePermissions.some((p) => {
      const permissionsJson = this.normalizePermissionArray(p.permissions_json);
      if (permissionsJson.length > 0) {
        return permissionNameMap[permission].some((name) => permissionsJson.includes(name));
      }
      return p[permissionField] === true;
    });
  }
}

export const permissionsService = new PermissionsService();
