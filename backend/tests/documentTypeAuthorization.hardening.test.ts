import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test, { afterEach } from 'node:test';

import { prisma } from '../src/config/prisma';
import { documentPermissionResolverService } from '../src/modules/authorization/document-permission-resolver.service';
import { rolesRepository } from '../src/modules/roles/roles.repository';
import { rolesService } from '../src/modules/roles/roles.service';
import { settingsRepository } from '../src/modules/settings/settings.repository';
import { settingsService } from '../src/modules/settings/settings.service';
import { normalizeDocumentTypePolicyV2 } from '../src/modules/settings/document-type-policy.helper';

const root = path.resolve(__dirname, '..', '..');
const originals = {
  documentTypeFindFirst: prisma.document_types.findFirst,
  usersFindMany: prisma.users.findMany,
  departmentsFindMany: prisma.departments.findMany,
  rolesFindMany: prisma.roles.findMany,
  positionsFindMany: prisma.positions.findMany,
  upsertSetting: settingsRepository.upsertSetting,
  roleCreate: rolesRepository.create,
};

function replace(target: object, key: string, value: unknown) {
  (target as Record<string, unknown>)[key] = value;
}

afterEach(() => {
  replace(prisma.document_types, 'findFirst', originals.documentTypeFindFirst);
  replace(prisma.users, 'findMany', originals.usersFindMany);
  replace(prisma.departments, 'findMany', originals.departmentsFindMany);
  replace(prisma.roles, 'findMany', originals.rolesFindMany);
  replace(prisma.positions, 'findMany', originals.positionsFindMany);
  replace(settingsRepository, 'upsertSetting', originals.upsertSetting);
  replace(rolesRepository, 'create', originals.roleCreate);
});

test('Manager RBAC role is removed without deleting organizational manager concepts', () => {
  const tenantService = fs.readFileSync(path.join(root, 'src/modules/tenants/tenants.service.ts'), 'utf8');
  const seed = fs.readFileSync(path.join(root, 'scripts/seed-rbac.js'), 'utf8');
  const schema = fs.readFileSync(path.join(root, 'prisma/schema.prisma'), 'utf8');
  const migration = fs.readFileSync(
    path.join(root, 'prisma/migrations/20260721160000_remove_manager_role/migration.sql'),
    'utf8',
  );

  assert.doesNotMatch(tenantService, /name:\s*['"]Manager['"]/);
  assert.doesNotMatch(seed, /name:\s*['"]Manager['"]/);
  assert.match(schema, /manager_id\s+Int\?/);
  assert.match(schema, /approver_type\s+String\s+\/\/ 'user', 'role', 'department', 'manager'/);
  assert.match(migration, /INSERT INTO "user_roles"/);
  assert.match(migration, /"assignee_type" = 'direct_manager'/);
  assert.match(migration, /DELETE FROM "document_permissions"/);
  assert.match(migration, /DELETE FROM "roles"/);
});

test('removed Manager role cannot be recreated through role CRUD', async () => {
  let created = false;
  replace(rolesRepository, 'create', async () => {
    created = true;
    return { id: 99 };
  });

  await assert.rejects(
    rolesService.createRole(7, { name: ' manager ' }),
    /not an assignable system role/,
  );
  assert.equal(created, false);
});

test('document-type policy UI preserves ACL templates it does not edit', () => {
  const source = fs.readFileSync(
    path.resolve(root, '../frontend/components/roles/DocumentTypePermissionsTab.tsx'),
    'utf8',
  );
  assert.match(source, /policy\?\.acl_templates \|\| \[\]\)\.filter\(\(item\) => !editableSubjectTypes\.has\(item\.subject_type\)\)/);
  assert.match(source, /'PENDING_APPROVAL'/);
  assert.match(source, /'COMPLETED'/);
  assert.match(source, /'ARCHIVED'/);
});

test('nested legacy policy fields round-trip without being discarded', () => {
  const policy = normalizeDocumentTypePolicyV2({
    legacy_rules: {
      allow_roles: ['Finance reviewer'],
      deny_departments: [12],
    },
    legacy_detail_permissions: [{
      subject_type: 'user',
      subject_id: 8,
      can_read: true,
    }],
  });

  assert.deepEqual(policy.legacy_rules.allow_roles, ['Finance reviewer']);
  assert.deepEqual(policy.legacy_rules.deny_departments, [12]);
  assert.equal(policy.legacy_detail_permissions.length, 1);
  assert.equal(policy.acl_templates[0]?.subject_type, 'specific_user');
});

test('policy save rejects a referenced user outside the tenant before persistence', async () => {
  replace(prisma.document_types, 'findFirst', async () => ({ id: 10 }));
  replace(prisma.users, 'findMany', async () => []);
  replace(prisma.departments, 'findMany', async () => []);
  replace(prisma.roles, 'findMany', async () => []);
  replace(prisma.positions, 'findMany', async () => []);
  let persisted = false;
  replace(settingsRepository, 'upsertSetting', async () => {
    persisted = true;
  });

  await assert.rejects(
    settingsService.saveDocumentTypePolicy(7, 10, {
      acl_templates: [{
        id: 'outside-user',
        subject_type: 'specific_user',
        subject_id: 999,
        permissions: ['VIEW'],
      }],
    }),
    /User not found in current tenant: 999/,
  );
  assert.equal(persisted, false);
});

test('legacy deny_roles applies to both RBAC role names and prevents document visibility', async () => {
  const result = await documentPermissionResolverService.resolveDocumentPermission(5, 7, 20, {
    user: {
      id: 5,
      tenant_id: 7,
      email: 'user@example.test',
      role: 'user',
      department_id: null,
      position_id: null,
      position: null,
      user_roles: [{ user_id: 5, role_id: 44, assigned_at: new Date(), role: {
        id: 44,
        tenant_id: 7,
        name: 'Finance reviewer',
        description: null,
        is_system: false,
        created_at: new Date(),
      } }],
    } as never,
    document: {
      id: 20,
      tenant_id: 7,
      owner_id: 8,
      department_id: null,
      document_type_id: 10,
      visibility_scope: 'company',
      confidential_level: 'normal',
      status: 'DRAFT',
      department: null,
      owner: { id: 8, manager_id: null, department_id: null },
    } as never,
    typePolicy: {
      version: 2,
      visibility: {
        default_visibility_scope: 'company',
        default_security_level: 'normal',
        auto_assign_creator_department: true,
        force_private_on_create: false,
      },
      acl_templates: [],
      advanced_policies: [],
      legacy_detail_permissions: [],
      legacy_rules: {
        allow_roles: [],
        deny_roles: ['Finance reviewer'],
        allow_departments: [],
        deny_departments: [],
      },
    },
    workflowParticipation: { isParticipant: false, isApprover: false, isSigner: false, isCc: false },
    aclPolicies: [],
  });

  assert.equal(result.canView, false);
  assert.equal(result.canDownload, false);
  assert.ok(result.reasons.some((reason) => reason.includes('Legacy deny role matched')));
});

test('document classification does not infer access from position hierarchy level', async () => {
  const result = await documentPermissionResolverService.resolveDocumentPermission(5, 7, 20, {
    user: {
      id: 5,
      tenant_id: 7,
      email: 'user@example.test',
      role: 'user',
      department_id: null,
      position_id: 3,
      position: { id: 3, level: 0 },
      user_roles: [],
    } as never,
    document: {
      id: 20,
      tenant_id: 7,
      owner_id: 8,
      department_id: null,
      document_type_id: 10,
      visibility_scope: 'company',
      confidential_level: 'top_secret',
      status: 'DRAFT',
      department: null,
      owner: { id: 8, manager_id: null, department_id: null },
    } as never,
    typePolicy: {
      version: 2,
      visibility: {
        default_visibility_scope: 'company',
        default_security_level: 'secret',
        auto_assign_creator_department: true,
        force_private_on_create: false,
      },
      acl_templates: [],
      advanced_policies: [],
      legacy_detail_permissions: [],
      legacy_rules: {
        allow_roles: [],
        deny_roles: [],
        allow_departments: [],
        deny_departments: [],
      },
    },
    workflowParticipation: { isParticipant: false, isApprover: false, isSigner: false, isCc: false },
    aclPolicies: [],
  });

  assert.equal(result.canView, true);
  assert.equal(result.canDownload, true);
  assert.ok(result.reasons.some((reason) => reason.includes('visibility scope: COMPANY')));
});
