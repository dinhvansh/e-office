import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(__dirname, '..', '..');
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('organization structure endpoint requires department and user update permissions', () => {
  const routes = read('src/modules/departments/departments.routes.ts');
  assert.match(routes, /put\('\/:id\/organization', requireAllPermissions\(\['departments', 'update'\], \['users', 'update'\]\)/);
  assert.match(routes, /get\('\/:id\/organization', requireAllPermissions\(\['departments', 'read'\], \['users', 'read'\], \['positions', 'read'\]\)/);
});

test('organization update is serializable and updates the structure atomically', () => {
  const service = read('src/modules/departments/organization-structure.service.ts');
  assert.match(service, /prisma\.\$transaction\(async \(tx\)/);
  assert.match(service, /TransactionIsolationLevel\.Serializable/);
  assert.match(service, /FOR UPDATE/);
  assert.match(service, /tx\.users\.update/);
  assert.match(service, /tx\.departments\.update/);
  assert.match(service, /tx\.department_support_managers\.createMany/);
});

test('moving a department manager requires a same-department replacement', () => {
  const service = read('src/modules/departments/organization-structure.service.ts');
  assert.match(service, /MANAGER_REPLACEMENT_REQUIRED/);
  assert.match(service, /replacement\.department_id !== managedDepartment\.id/);
  assert.match(service, /department_support_managers\.deleteMany\(\{ where: \{ user_id: \{ in: departingIds \}/);
  assert.match(service, /manager_id: \{ in: departingIds \} \}, data: \{ manager_id: null \}/);
});

test('new organization screen coexists with legacy organization routes', () => {
  const sidebar = read('../frontend/constants/sidebarItems.ts');
  assert.match(sidebar, /href: "\/organization"/);
  assert.match(sidebar, /href: "\/users"/);
  assert.doesNotMatch(sidebar, /href: "\/departments"/);
  assert.match(sidebar, /href: "\/positions"/);
});

test('organization screen can create a person in the selected department', () => {
  const page = read('../frontend/app/(dashboard)/organization/page.tsx');
  assert.match(page, /fetchJson<Person>\('\/users'/);
  assert.match(page, /department_id: activeDepartmentId/);
  assert.match(page, /position_id: Number\(personForm\.position_id\)/);
  assert.match(page, /hasPermission\('users:create'\)/);
  assert.match(page, /actionLabel=\{canCreatePosition \? t\('organization\.createPositionInline'\)/);
  assert.match(page, /position_id: String\(position\.id\)/);
});

test('user creation validates tenant roles and falls back to the system User role', () => {
  const service = read('src/modules/users/users.service.ts');
  assert.match(service, /tenant_id: tenantId, id: \{ in: requestedRoleIds \}/);
  assert.match(service, /name: \{ equals: 'User', mode: 'insensitive' \}/);
  assert.match(service, /assignRoles\(user\.id, effectiveRoleIds\)/);
});

test('organization screen exposes permission-gated department and position deletion', () => {
  const page = read('../frontend/app/(dashboard)/organization/page.tsx');
  assert.match(page, /hasPermission\('departments:delete'\)/);
  assert.match(page, /fetchJson\(`\/departments\/\$\{departmentId\}`.*method: 'DELETE'/);
  assert.match(page, /hasPermission\('positions:delete'\)/);
  assert.match(page, /fetchJson\(`\/positions\/\$\{positionId\}`.*method: 'DELETE'/);
  assert.match(page, /useDestructiveConfirmation/);
});

test('organization screen separates transferring, deactivating and deleting a user account', () => {
  const page = read('../frontend/app/(dashboard)/organization/page.tsx');
  const controller = read('src/modules/users/users.controller.ts');
  assert.match(page, /hasPermission\('users:delete'\)/);
  assert.match(page, /fetchJson\(`\/users\/\$\{userId\}`.*method: 'DELETE'/);
  assert.doesNotMatch(page, /UserMinus/);
  assert.match(page, /requestDeletePerson/);
  assert.match(page, /requestDeactivatePerson/);
  assert.match(page, /openTransferPerson/);
  assert.match(controller, /targetUserId === req\.auth!\.userId/);
});

test('organization screen supports safe department transfer and account deactivation', () => {
  const page = read('../frontend/app/(dashboard)/organization/page.tsx');
  const service = read('src/modules/users/users.service.ts');
  const controller = read('src/modules/users/users.controller.ts');
  assert.match(page, /ArrowRightLeft/);
  assert.match(page, /transferPersonMutation/);
  assert.match(page, /manager_replacements:/);
  assert.match(page, /body: JSON\.stringify\(\{ status: 'inactive' \}\)/);
  assert.match(service, /Assign a replacement department manager before deactivating this user/);
  assert.match(service, /Reassign pending approval and signing tasks before deactivating this user/);
  assert.match(controller, /Cannot deactivate the currently authenticated user/);
});

test('delete guards preserve departments and positions referenced by workflow or permissions', () => {
  const departments = read('src/modules/departments/departments.service.ts');
  const positions = read('src/modules/positions/positions.service.ts');
  assert.match(departments, /workflow_steps\.count/);
  assert.match(departments, /document_permissions\.count/);
  assert.match(departments, /DEPARTMENT_IN_USE/);
  assert.match(positions, /workflow_steps\.count/);
  assert.match(positions, /document_permissions\.count/);
});
