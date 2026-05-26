const { PrismaClient } = require("@prisma/client");
const fetch = require("node-fetch");
const { permissionsService } = require("../dist/modules/documents/permissions.service");

const prisma = new PrismaClient();
const API_BASE = "http://localhost:4000/api/v1";

let adminToken = "";
let adminUser = null;
let targetUser = null;
let documentId = null;

async function login() {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "admin@acme.local",
      password: "secret123",
    }),
  });

  const data = await response.json();
  if (!response.ok || !data?.success) {
    throw new Error(`Login failed: ${JSON.stringify(data)}`);
  }

  adminToken = data.data.tokens.accessToken;
}

async function prepareFixtures() {
  adminUser = await prisma.users.findFirst({
    where: { email: "admin@acme.local", status: "active" },
    select: { id: true, tenant_id: true, department_id: true, position_id: true, email: true },
  });

  if (!adminUser) {
    throw new Error("Admin user not found");
  }

  targetUser = await prisma.users.findFirst({
    where: {
      tenant_id: adminUser.tenant_id,
      status: "active",
      id: { not: adminUser.id },
      department_id: { not: null },
      position_id: { not: null },
    },
    select: { id: true, email: true, department_id: true, position_id: true },
    orderBy: { id: "asc" },
  });

  if (!targetUser) {
    throw new Error("No non-admin active user with department and position found");
  }

  const document = await prisma.documents.findFirst({
    where: { tenant_id: adminUser.tenant_id },
    select: { id: true },
    orderBy: { id: "asc" },
  });

  if (!document) {
    throw new Error("No document found for tenant");
  }

  documentId = document.id;
}

async function cleanupPermissions() {
  await prisma.document_permissions.deleteMany({
    where: {
      document_id: documentId,
      OR: [
        { subject_type: "user", subject_id: targetUser.id },
        { subject_type: "department", subject_id: targetUser.department_id || 0 },
        {
          subject_type: "position_in_department",
          subject_id: targetUser.position_id || 0,
          scope_department_id: targetUser.department_id || 0,
        },
      ],
    },
  });
}

async function api(method, path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json();
  if (!response.ok || !data?.success) {
    throw new Error(`${method} ${path} failed: ${JSON.stringify(data)}`);
  }

  return data.data;
}

async function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  console.log("\n=== E2E Document Permissions ===");
  await login();
  await prepareFixtures();
  await cleanupPermissions();

  console.log(`Using document #${documentId} and user #${targetUser.id}`);

  console.log("1. Direct baseline permission gives read access");
  await api("POST", `/documents/${documentId}/permissions`, {
    permission_source: "baseline",
    subject_type: "user",
    subject_id: targetUser.id,
    can_read: true,
    can_edit: false,
    can_approve: false,
    can_share: false,
    can_delete: false,
  });
  await assert(await permissionsService.checkPermission(documentId, targetUser.id, "read"), "Expected direct read permission");
  await cleanupPermissions();

  console.log("2. Department permission gives approve access");
  await api("POST", `/documents/${documentId}/permissions`, {
    permission_source: "share",
    subject_type: "department",
    subject_id: targetUser.department_id,
    can_read: false,
    can_edit: false,
    can_approve: true,
    can_share: false,
    can_delete: false,
  });
  await assert(await permissionsService.checkPermission(documentId, targetUser.id, "approve"), "Expected department approve permission");
  await cleanupPermissions();

  console.log("3. Position in department permission gives share access");
  await api("POST", `/documents/${documentId}/permissions`, {
    permission_source: "baseline",
    subject_type: "position_in_department",
    subject_id: targetUser.position_id,
    scope_department_id: targetUser.department_id,
    can_read: false,
    can_edit: false,
    can_approve: false,
    can_share: true,
    can_delete: false,
  });
  await assert(await permissionsService.checkPermission(documentId, targetUser.id, "share"), "Expected position_in_department share permission");
  await cleanupPermissions();

  console.log("4. Share and baseline coexist for the same user");
  await api("POST", `/documents/${documentId}/permissions`, {
    permission_source: "baseline",
    subject_type: "user",
    subject_id: targetUser.id,
    can_read: true,
    can_edit: false,
    can_approve: false,
    can_share: false,
    can_delete: false,
  });
  await api("POST", `/documents/${documentId}/permissions`, {
    permission_source: "share",
    subject_type: "user",
    subject_id: targetUser.id,
    can_read: true,
    can_edit: false,
    can_approve: false,
    can_share: false,
    can_delete: false,
  });

  console.log("5. Verify coexistence via API");
  const permissionsPayload = await api("GET", `/documents/${documentId}/permissions`);
  const permissions = permissionsPayload.permissions || [];

  const baselineUser = permissions.find(
    (item) =>
      item.permission_source === "baseline" &&
      item.subject_type === "user" &&
      item.subject_id === targetUser.id,
  );
  const shareUser = permissions.find(
    (item) =>
      item.permission_source === "share" &&
      item.subject_type === "user" &&
      item.subject_id === targetUser.id,
  );

  await assert(!!baselineUser, "Missing baseline user permission");
  await assert(!!shareUser, "Missing share user permission");

  console.log("6. Revoke share permission from user and verify baseline remains");
  await api("DELETE", `/documents/${documentId}/permissions`, {
    permission_source: "share",
    subject_type: "user",
    subject_id: targetUser.id,
  });

  const afterRevokePayload = await api("GET", `/documents/${documentId}/permissions`);
  const afterRevoke = afterRevokePayload.permissions || [];
  const stillHasBaseline = afterRevoke.some(
    (item) =>
      item.permission_source === "baseline" &&
      item.subject_type === "user" &&
      item.subject_id === targetUser.id,
  );
  const stillHasShare = afterRevoke.some(
    (item) =>
      item.permission_source === "share" &&
      item.subject_type === "user" &&
      item.subject_id === targetUser.id,
  );

  await assert(stillHasBaseline, "Baseline permission should remain after revoking share");
  await assert(!stillHasShare, "Share permission should be removed");

  await cleanupPermissions();
  console.log("PASS: document permissions E2E");
}

run()
  .catch(async (error) => {
    console.error("FAIL:", error.message);
    if (documentId && targetUser) {
      await cleanupPermissions().catch(() => {});
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
