type LegacyDetailPermission = {
  subject_type: "user" | "department" | "position_in_department";
  subject_id: number;
  scope_department_id?: number;
  can_read?: boolean;
  can_edit?: boolean;
  can_approve?: boolean;
  can_share?: boolean;
  can_delete?: boolean;
};

export type DocumentVisibilityScope =
  | "private"
  | "creator_only"
  | "department"
  | "department_and_manager"
  | "workflow_only"
  | "company"
  | "custom_acl";

export type DocumentSecurityLevel =
  | "normal"
  | "internal"
  | "confidential"
  | "secret";

export type DocumentAclTemplateSubjectType =
  | "creator"
  | "creator_department"
  | "creator_manager"
  | "specific_department"
  | "specific_role"
  | "specific_user"
  | "workflow_participant"
  | "cc_user"
  | "legacy_position_in_department";

export type DocumentAclTemplatePermission =
  | "CREATE"
  | "VIEW"
  | "DOWNLOAD"
  | "EDIT"
  | "COMMENT"
  | "APPROVE"
  | "SIGN"
  | "SHARE"
  | "DELETE";

export type DocumentAclTemplateScope =
  | "OWN"
  | "DEPARTMENT"
  | "COMPANY"
  | "ASSIGNED_ONLY"
  | "ALL";

export type AdvancedPolicyEffect = "ALLOW" | "DENY";

export type DocumentTypeAclTemplate = {
  id: string;
  subject_type: DocumentAclTemplateSubjectType;
  subject_id?: number | null;
  scope?: DocumentAclTemplateScope | null;
  permissions: DocumentAclTemplatePermission[];
  status_limit?: string[] | null;
  is_active: boolean;
  scope_department_id?: number | null;
};

export type DocumentTypeAdvancedPolicy = {
  id: string;
  name: string;
  priority: number;
  effect: AdvancedPolicyEffect;
  condition_json: Record<string, unknown>;
  permission_json: Record<string, unknown>;
  is_active: boolean;
};

export type DocumentTypePolicyV2 = {
  version: 2;
  visibility: {
    default_visibility_scope: DocumentVisibilityScope;
    default_security_level: DocumentSecurityLevel;
    auto_assign_creator_department: boolean;
    force_private_on_create: boolean;
  };
  acl_templates: DocumentTypeAclTemplate[];
  advanced_policies: DocumentTypeAdvancedPolicy[];
  legacy_detail_permissions: LegacyDetailPermission[];
  legacy_rules: {
    allow_roles: string[];
    deny_roles: string[];
    allow_departments: number[];
    deny_departments: number[];
    min_position_level: number | null;
  };
};

const ALLOWED_VISIBILITY_SCOPES = new Set<DocumentVisibilityScope>([
  "private",
  "creator_only",
  "department",
  "department_and_manager",
  "workflow_only",
  "company",
  "custom_acl",
]);

const ALLOWED_SECURITY_LEVELS = new Set<DocumentSecurityLevel>([
  "normal",
  "internal",
  "confidential",
  "secret",
]);

const ALLOWED_TEMPLATE_PERMISSIONS = new Set<DocumentAclTemplatePermission>([
  "CREATE",
  "VIEW",
  "DOWNLOAD",
  "EDIT",
  "COMMENT",
  "APPROVE",
  "SIGN",
  "SHARE",
  "DELETE",
]);

const ALLOWED_TEMPLATE_SCOPES = new Set<DocumentAclTemplateScope>([
  "OWN",
  "DEPARTMENT",
  "COMPANY",
  "ASSIGNED_ONLY",
  "ALL",
]);

const ALLOWED_TEMPLATE_SUBJECT_TYPES = new Set<DocumentAclTemplateSubjectType>([
  "creator",
  "creator_department",
  "creator_manager",
  "specific_department",
  "specific_role",
  "specific_user",
  "workflow_participant",
  "cc_user",
  "legacy_position_in_department",
]);

const normalizeStringArray = (value: unknown) =>
  Array.from(
    new Set(
      Array.isArray(value)
        ? value.map((item) => String(item || "").trim()).filter(Boolean)
        : []
    )
  );

const normalizeNumberArray = (value: unknown) =>
  Array.from(
    new Set(
      Array.isArray(value)
        ? value
            .map((item) => Number(item))
            .filter((item) => Number.isInteger(item) && item > 0)
        : []
    )
  );

function normalizeVisibilityScope(value: unknown): DocumentVisibilityScope {
  const normalized = String(value || "").trim().toLowerCase();
  const scopeMap: Record<string, DocumentVisibilityScope> = {
    private: "private",
    creator_only: "creator_only",
    department: "department",
    department_and_manager: "department_and_manager",
    workflow_only: "workflow_only",
    company: "company",
    custom_acl: "custom_acl",
    public: "company",
  };
  return scopeMap[normalized] && ALLOWED_VISIBILITY_SCOPES.has(scopeMap[normalized])
    ? scopeMap[normalized]
    : "department";
}

function normalizeSecurityLevel(value: unknown): DocumentSecurityLevel {
  const normalized = String(value || "").trim().toLowerCase();
  const levelMap: Record<string, DocumentSecurityLevel> = {
    normal: "normal",
    internal: "internal",
    confidential: "confidential",
    secret: "secret",
    top_secret: "secret",
  };
  return levelMap[normalized] && ALLOWED_SECURITY_LEVELS.has(levelMap[normalized])
    ? levelMap[normalized]
    : "normal";
}

function normalizeLegacyDetailPermissions(value: unknown): LegacyDetailPermission[] {
  return Array.isArray(value)
    ? value
        .map((item) => ({
          subject_type:
            item?.subject_type === "department" || item?.subject_type === "position_in_department"
              ? item.subject_type
              : "user",
          subject_id: Number(item?.subject_id),
          scope_department_id: item?.scope_department_id ? Number(item.scope_department_id) : undefined,
          can_read: Boolean(item?.can_read),
          can_edit: Boolean(item?.can_edit),
          can_approve: Boolean(item?.can_approve),
          can_share: Boolean(item?.can_share),
          can_delete: Boolean(item?.can_delete),
        }))
        .filter((item) => Number.isInteger(item.subject_id) && item.subject_id > 0)
        .filter(
          (item) =>
            item.subject_type !== "position_in_department" ||
            (Number.isInteger(item.scope_department_id) && Number(item.scope_department_id) > 0)
        )
    : [];
}

function normalizeAclTemplateSubjectType(value: unknown): DocumentAclTemplateSubjectType {
  const normalized = String(value || "").trim().toLowerCase();
  const subjectTypeMap: Record<string, DocumentAclTemplateSubjectType> = {
    creator: "creator",
    creator_department: "creator_department",
    creator_manager: "creator_manager",
    specific_department: "specific_department",
    specific_role: "specific_role",
    specific_user: "specific_user",
    workflow_participant: "workflow_participant",
    cc_user: "cc_user",
    legacy_position_in_department: "legacy_position_in_department",
  };

  return subjectTypeMap[normalized] && ALLOWED_TEMPLATE_SUBJECT_TYPES.has(subjectTypeMap[normalized])
    ? subjectTypeMap[normalized]
    : "specific_user";
}

function normalizeAclTemplates(value: unknown): DocumentTypeAclTemplate[] {
  return Array.isArray(value)
    ? value
        .map((item, index) => {
          const permissions = normalizeStringArray(item?.permissions)
            .map((permission) => String(permission).trim().toUpperCase())
            .filter((permission): permission is DocumentAclTemplatePermission =>
              ALLOWED_TEMPLATE_PERMISSIONS.has(permission as DocumentAclTemplatePermission)
            );

          const statusLimit = normalizeStringArray(item?.status_limit).map((status) => status.toUpperCase());
          const scope = String(item?.scope || "").trim().toUpperCase();
          const subjectType = normalizeAclTemplateSubjectType(item?.subject_type);
          const subjectId = item?.subject_id === null || item?.subject_id === undefined || item?.subject_id === ""
            ? null
            : Number(item?.subject_id);
          const scopeDepartmentId = item?.scope_department_id
            ? Number(item.scope_department_id)
            : null;

          return {
            id: String(item?.id || `acl-${index}`),
            subject_type: subjectType,
            subject_id: Number.isInteger(subjectId) && subjectId > 0 ? subjectId : null,
            scope: ALLOWED_TEMPLATE_SCOPES.has(scope as DocumentAclTemplateScope)
              ? (scope as DocumentAclTemplateScope)
              : "ASSIGNED_ONLY",
            permissions,
            status_limit: statusLimit.length ? statusLimit : null,
            is_active: item?.is_active === undefined ? true : Boolean(item?.is_active),
            scope_department_id:
              Number.isInteger(scopeDepartmentId) && scopeDepartmentId > 0 ? scopeDepartmentId : null,
          } satisfies DocumentTypeAclTemplate;
        })
        .filter((item) => item.permissions.length > 0)
    : [];
}

function normalizeAdvancedPolicies(value: unknown): DocumentTypeAdvancedPolicy[] {
  return Array.isArray(value)
    ? value.map((item, index) => ({
        id: String(item?.id || `policy-${index}`),
        name: String(item?.name || `Policy ${index + 1}`).trim(),
        priority: Number.isFinite(Number(item?.priority)) ? Number(item?.priority) : index + 1,
        effect: String(item?.effect || "ALLOW").trim().toUpperCase() === "DENY" ? "DENY" : "ALLOW",
        condition_json:
          item?.condition_json && typeof item.condition_json === "object" && !Array.isArray(item.condition_json)
            ? item.condition_json
            : {},
        permission_json:
          item?.permission_json && typeof item.permission_json === "object" && !Array.isArray(item.permission_json)
            ? item.permission_json
            : {},
        is_active: item?.is_active === undefined ? true : Boolean(item?.is_active),
      }))
    : [];
}

function convertLegacyDetailPermissionsToAclTemplates(
  permissions: LegacyDetailPermission[]
): DocumentTypeAclTemplate[] {
  return permissions.map((permission, index) => {
    const mappedPermissions: DocumentAclTemplatePermission[] = [];
    if (permission.can_read) mappedPermissions.push("VIEW", "DOWNLOAD");
    if (permission.can_edit) mappedPermissions.push("EDIT");
    if (permission.can_approve) mappedPermissions.push("APPROVE");
    if (permission.can_share) mappedPermissions.push("SHARE");
    if (permission.can_delete) mappedPermissions.push("DELETE");

    const subjectTypeMap: Record<LegacyDetailPermission["subject_type"], DocumentAclTemplateSubjectType> = {
      user: "specific_user",
      department: "specific_department",
      position_in_department: "legacy_position_in_department",
    };

    return {
      id: `legacy-${index}`,
      subject_type: subjectTypeMap[permission.subject_type],
      subject_id: permission.subject_id,
      scope: permission.subject_type === "department" ? "DEPARTMENT" : "ASSIGNED_ONLY",
      permissions: mappedPermissions,
      status_limit: null,
      is_active: true,
      scope_department_id: permission.scope_department_id ?? null,
    };
  });
}

function validateAclTemplates(templates: DocumentTypeAclTemplate[]) {
  for (const template of templates) {
    const requiresSubjectId =
      template.subject_type === "specific_department" ||
      template.subject_type === "specific_role" ||
      template.subject_type === "specific_user" ||
      template.subject_type === "legacy_position_in_department";

    if (requiresSubjectId && (!template.subject_id || template.subject_id <= 0)) {
      throw new Error(`ACL template ${template.id} requires subject_id`);
    }

    if (
      template.subject_type === "legacy_position_in_department" &&
      (!template.scope_department_id || template.scope_department_id <= 0)
    ) {
      throw new Error(`ACL template ${template.id} requires scope_department_id`);
    }

    if (
      template.permissions.includes("DELETE") &&
      ["specific_department", "creator_department"].includes(template.subject_type)
    ) {
      throw new Error("Không được cấp quyền Xóa rộng cho phòng ban");
    }

    if (template.permissions.includes("DELETE") && template.scope === "COMPANY") {
      throw new Error("Không được cấp quyền Xóa cho toàn công ty");
    }

    if (template.subject_type === "creator") {
      const hasMutatingCreatorPermission =
        template.permissions.includes("EDIT") || template.permissions.includes("DELETE");
      const statusLimit = template.status_limit || [];
      if (
        hasMutatingCreatorPermission &&
        !statusLimit.every((status) => ["DRAFT", "REJECTED"].includes(status))
      ) {
        throw new Error("Creator chỉ được Edit/Delete ở trạng thái DRAFT hoặc REJECTED");
      }
    }

    if (template.subject_type === "workflow_participant" && !template.permissions.includes("VIEW")) {
      throw new Error("Workflow participant phải luôn có quyền VIEW");
    }
  }
}

export function normalizeDocumentTypePolicyV2(policy: any): DocumentTypePolicyV2 {
  const source = policy && typeof policy === "object" ? policy : {};
  const visibility = source.visibility && typeof source.visibility === "object" ? source.visibility : {};
  const legacyDetailPermissions = normalizeLegacyDetailPermissions(source.detail_permissions);
  const aclTemplates = normalizeAclTemplates(source.acl_templates);
  const advancedPolicies = normalizeAdvancedPolicies(source.advanced_policies);

  const normalized: DocumentTypePolicyV2 = {
    version: 2,
    visibility: {
      default_visibility_scope: normalizeVisibilityScope(
        visibility.default_visibility_scope ?? source.default_visibility_scope
      ),
      default_security_level: normalizeSecurityLevel(
        visibility.default_security_level ?? source.default_confidential_level
      ),
      auto_assign_creator_department:
        visibility.auto_assign_creator_department === undefined
          ? source.inherit_creator_department === undefined
            ? true
            : Boolean(source.inherit_creator_department)
          : Boolean(visibility.auto_assign_creator_department),
      force_private_on_create:
        visibility.force_private_on_create === undefined
          ? Boolean(source.force_private_until_completed)
          : Boolean(visibility.force_private_on_create),
    },
    acl_templates: aclTemplates.length ? aclTemplates : convertLegacyDetailPermissionsToAclTemplates(legacyDetailPermissions),
    advanced_policies: advancedPolicies,
    legacy_detail_permissions: legacyDetailPermissions,
    legacy_rules: {
      allow_roles: normalizeStringArray(source.allow_roles),
      deny_roles: normalizeStringArray(source.deny_roles),
      allow_departments: normalizeNumberArray(source.allow_departments),
      deny_departments: normalizeNumberArray(source.deny_departments),
      min_position_level:
        Number.isFinite(Number(source.min_position_level)) && Number(source.min_position_level) > 0
          ? Number(source.min_position_level)
          : null,
    },
  };

  if (normalized.visibility.force_private_on_create) {
    normalized.visibility.default_visibility_scope = "private";
  }

  validateAclTemplates(normalized.acl_templates);

  return normalized;
}

export function serializeDocumentTypePolicyV2(policy: DocumentTypePolicyV2) {
  return {
    version: 2,
    visibility: policy.visibility,
    acl_templates: policy.acl_templates,
    advanced_policies: policy.advanced_policies,
    detail_permissions: policy.legacy_detail_permissions,
    allow_roles: policy.legacy_rules.allow_roles,
    deny_roles: policy.legacy_rules.deny_roles,
    allow_departments: policy.legacy_rules.allow_departments,
    deny_departments: policy.legacy_rules.deny_departments,
    min_position_level: policy.legacy_rules.min_position_level,
    default_visibility_scope: policy.visibility.default_visibility_scope,
    default_confidential_level: policy.visibility.default_security_level,
    inherit_creator_department: policy.visibility.auto_assign_creator_department,
    force_private_until_completed: policy.visibility.force_private_on_create,
  };
}

type PolicySubjectUser = {
  id: number;
  department_id?: number | null;
  position_id?: number | null;
  user_roles?: Array<{ role_id: number }> | undefined;
};

export function canCreateFromDocumentTypePolicy(
  policy: DocumentTypePolicyV2,
  user: PolicySubjectUser
) {
  const createTemplates = policy.acl_templates.filter(
    (template) => template.is_active && template.permissions.includes("CREATE")
  );

  if (createTemplates.length === 0) {
    return true;
  }

  const roleIds = new Set((user.user_roles || []).map((item) => item.role_id));

  return createTemplates.some((template) => {
    switch (template.subject_type) {
      case "specific_user":
        return template.subject_id === user.id;
      case "specific_department":
        return !!user.department_id && template.subject_id === user.department_id;
      case "legacy_position_in_department":
        return (
          !!user.position_id &&
          !!user.department_id &&
          template.subject_id === user.position_id &&
          template.scope_department_id === user.department_id
        );
      case "specific_role":
        return !!template.subject_id && roleIds.has(template.subject_id);
      default:
        return false;
    }
  });
}

export function mapSecurityLevelToDocumentConfidentialLevel(level: DocumentSecurityLevel): string {
  const mapping: Record<DocumentSecurityLevel, string> = {
    normal: "normal",
    internal: "internal",
    confidential: "confidential",
    secret: "secret",
  };
  return mapping[level] ?? "normal";
}
