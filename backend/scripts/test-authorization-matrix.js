const axios = require("axios");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env"), override: false });
dotenv.config({ path: path.resolve(__dirname, "../../.env.compose"), override: false });
if (process.env.E2E_USE_LOCAL_DB === "1" && process.env.DATABASE_URL && process.env.DATABASE_URL.includes("@db:")) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace("@db:", "@localhost:");
}

const prisma = new PrismaClient();
const API_BASE = process.env.E2E_API_BASE || "http://localhost:4000/api/v1";
const PASSWORD = process.env.E2E_ROLE_PASSWORD;
if (!PASSWORD) {
  throw new Error("E2E_ROLE_PASSWORD is required; this test must not use a shared default password");
}

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is required to issue isolated E2E test tokens");
}

async function issueAccessToken(email) {
  const user = await prisma.users.findUnique({ where: { email } });
  if (!user) throw new Error(`User not found for token issuance: ${email}`);
  return jwt.sign(
    { sub: user.id.toString(), tenantId: user.tenant_id, role: user.role ?? null },
    JWT_SECRET,
    { expiresIn: "15m" }
  );
}

async function ensureRoleUser(tenantId, roleName, email, displayRole) {
  const role = await prisma.roles.findFirst({
    where: { tenant_id: tenantId, name: roleName },
  });
  if (!role) {
    throw new Error(`Role ${roleName} not found`);
  }

  const hash = bcrypt.hashSync(PASSWORD, 10);
  const user = await prisma.users.upsert({
    where: { email },
    update: {
      tenant_id: tenantId,
      password_hash: hash,
      role: displayRole,
      status: "active",
    },
    create: {
      tenant_id: tenantId,
      email,
      password_hash: hash,
      role: displayRole,
      status: "active",
      full_name: `${roleName} E2E`,
    },
  });

  // Ensure test user has only the target role for deterministic authorization checks
  await prisma.user_roles.deleteMany({ where: { user_id: user.id } });
  await prisma.user_roles.create({
    data: {
      user_id: user.id,
      role_id: role.id,
    },
  });

  return user;
}

async function ensureTenantViewerWithDocumentRead(tenantName, email) {
  const tenant = await prisma.tenants.create({
    data: {
      name: tenantName,
      domain: `${tenantName.toLowerCase().replace(/\s+/g, '-')}.local`,
      plan: "saas-starter",
      status: "active",
    },
  });

  let viewerRole = await prisma.roles.findFirst({
    where: { tenant_id: tenant.id, name: "Viewer" },
  });
  if (!viewerRole) {
    viewerRole = await prisma.roles.create({
      data: {
        tenant_id: tenant.id,
        name: "Viewer",
        description: "Read-only",
        is_system: true,
      },
    });
  }

  const docReadPermission = await prisma.permissions.findUnique({
    where: { resource_action: { resource: "documents", action: "read" } },
  });
  if (docReadPermission) {
    await prisma.role_permissions.upsert({
      where: {
        role_id_permission_id: {
          role_id: viewerRole.id,
          permission_id: docReadPermission.id,
        },
      },
      update: {},
      create: { role_id: viewerRole.id, permission_id: docReadPermission.id },
    });
  }

  const hash = bcrypt.hashSync(PASSWORD, 10);
  const user = await prisma.users.upsert({
    where: { email },
    update: {
      tenant_id: tenant.id,
      password_hash: hash,
      role: "viewer",
      status: "active",
    },
    create: {
      tenant_id: tenant.id,
      email,
      password_hash: hash,
      role: "viewer",
      status: "active",
      full_name: "Cross Tenant Viewer",
    },
  });

  await prisma.user_roles.deleteMany({ where: { user_id: user.id } });
  await prisma.user_roles.create({
    data: {
      user_id: user.id,
      role_id: viewerRole.id,
    },
  });

  return { tenant, user };
}

async function run() {
  try {
    console.log("== Authorization Matrix Regression ==");
    const tenant = await prisma.tenants.findFirst();
    if (!tenant) {
      throw new Error("Tenant not found");
    }

    await ensureRoleUser(tenant.id, "Admin", "admin.matrix@acme.local", "admin");
    await ensureRoleUser(tenant.id, "Manager", "manager.matrix@acme.local", "manager");
    await ensureRoleUser(tenant.id, "User", "user.matrix@acme.local", "user");
    await ensureRoleUser(tenant.id, "Viewer", "viewer.matrix@acme.local", "viewer");

    const adminToken = await issueAccessToken("admin.matrix@acme.local");
    const managerToken = await issueAccessToken("manager.matrix@acme.local");
    const userToken = await issueAccessToken("user.matrix@acme.local");
    const viewerToken = await issueAccessToken("viewer.matrix@acme.local");

    // Prepare existing resources for update/delete permission checks
    const deptCode = `SEC${Date.now()}`.slice(-6);
    const createdDept = await axios.post(
      `${API_BASE}/departments`,
      { code: deptCode, name: `Security Dept ${deptCode}` },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const departmentId = createdDept.data?.data?.id;

    const createdPosition = await axios.post(
      `${API_BASE}/positions`,
      { code: `POS${Date.now()}`.slice(-6), name: "Security Position", level: 1 },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const positionId = createdPosition.data?.data?.position?.id;

    const createdDocType = await axios.post(
      `${API_BASE}/document-types`,
      { code: `DT${Date.now()}`.slice(-6), name: "Security Doc Type", require_approval: false },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const documentTypeId = createdDocType.data?.data?.id;

    const createdExternalOrg = await axios.post(
      `${API_BASE}/external-orgs`,
      { name: `Security Partner ${Date.now()}`, code: `ORG${Date.now()}`.slice(-10), email: `matrix-${Date.now()}@example.test` },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const externalOrgId = createdExternalOrg.data?.data?.id;

    const crossTenantDoc = await axios.post(
      `${API_BASE}/documents`,
      {
        file_name: `cross-tenant-${Date.now()}.txt`,
        file_base64: Buffer.from("cross tenant isolation doc").toString("base64"),
        mime_type: "text/plain",
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    const crossTenantDocumentId = crossTenantDoc.data?.data?.document?.id;

    const { user: crossTenantUser } = await ensureTenantViewerWithDocumentRead(
      `Matrix Tenant ${Date.now()}`,
      `viewer.cross.${Date.now()}@acme.local`
    );
    const crossTenantToken = jwt.sign(
      { sub: crossTenantUser.id.toString(), tenantId: crossTenantUser.tenant_id, role: crossTenantUser.role ?? null },
      process.env.JWT_SECRET || "replace-me-jwt-secret-with-32-chars-minimum",
      { expiresIn: "15m" }
    );

    const cases = [
      {
        name: "Admin can create department",
        fn: () =>
          axios.post(
            `${API_BASE}/departments`,
            { code: `QA${Date.now()}`.slice(-4), name: "QA Dept" },
            { headers: { Authorization: `Bearer ${adminToken}` } }
          ),
        expectOk: true,
      },
      {
        name: "Viewer cannot create document",
        fn: () =>
          axios.post(
            `${API_BASE}/documents`,
            {
              file_name: `viewer-${Date.now()}.txt`,
              file_base64: Buffer.from("viewer should fail").toString("base64"),
              mime_type: "text/plain",
            },
            { headers: { Authorization: `Bearer ${viewerToken}` } }
          ),
        expectOk: false,
      },
      {
        name: "Manager can create document",
        fn: () =>
          axios.post(
            `${API_BASE}/documents`,
            {
              file_name: `manager-${Date.now()}.txt`,
              file_base64: Buffer.from("manager can create").toString("base64"),
              mime_type: "text/plain",
            },
            { headers: { Authorization: `Bearer ${managerToken}` } }
          ),
        expectOk: true,
      },
      {
        name: "User can create document",
        fn: () =>
          axios.post(
            `${API_BASE}/documents`,
            {
              file_name: `user-${Date.now()}.txt`,
              file_base64: Buffer.from("user can create").toString("base64"),
              mime_type: "text/plain",
            },
            { headers: { Authorization: `Bearer ${userToken}` } }
          ),
        expectOk: true,
      },
      {
        name: "Viewer can read documents list",
        fn: () =>
          axios.get(`${API_BASE}/documents`, {
            headers: { Authorization: `Bearer ${viewerToken}` },
          }),
        expectOk: true,
      },
      {
        name: "Viewer cannot create department",
        fn: () =>
          axios.post(
            `${API_BASE}/departments`,
            { code: `VW${Date.now()}`.slice(-6), name: "Viewer Dept" },
            { headers: { Authorization: `Bearer ${viewerToken}` } }
          ),
        expectOk: false,
      },
      {
        name: "Manager cannot update department",
        fn: () =>
          axios.put(
            `${API_BASE}/departments/${departmentId}`,
            { description: "Manager should not update" },
            { headers: { Authorization: `Bearer ${managerToken}` } }
          ),
        expectOk: false,
      },
      {
        name: "Admin can update department",
        fn: () =>
          axios.put(
            `${API_BASE}/departments/${departmentId}`,
            { description: "Updated by admin" },
            { headers: { Authorization: `Bearer ${adminToken}` } }
          ),
        expectOk: true,
      },
      {
        name: "Viewer can read document types",
        fn: () =>
          axios.get(`${API_BASE}/document-types`, {
            headers: { Authorization: `Bearer ${viewerToken}` },
          }),
        expectOk: true,
      },
      {
        name: "User cannot create document type",
        fn: () =>
          axios.post(
            `${API_BASE}/document-types`,
            { code: `UDT${Date.now()}`.slice(-6), name: "User Doc Type" },
            { headers: { Authorization: `Bearer ${userToken}` } }
          ),
        expectOk: false,
      },
      {
        name: "Admin can update document type",
        fn: () =>
          axios.put(
            `${API_BASE}/document-types/${documentTypeId}`,
            { description: "Updated by admin" },
            { headers: { Authorization: `Bearer ${adminToken}` } }
          ),
        expectOk: true,
      },
      {
        name: "Viewer cannot update position",
        fn: () =>
          axios.put(
            `${API_BASE}/positions/${positionId}`,
            { name: "Viewer Update" },
            { headers: { Authorization: `Bearer ${viewerToken}` } }
          ),
        expectOk: false,
      },
      {
        name: "Admin can update position",
        fn: () =>
          axios.put(
            `${API_BASE}/positions/${positionId}`,
            { name: "Admin Update" },
            { headers: { Authorization: `Bearer ${adminToken}` } }
          ),
        expectOk: true,
      },
      {
        name: "User cannot create external organization",
        fn: () =>
          axios.post(
            `${API_BASE}/external-orgs`,
            { name: "User external organization", code: `UORG${Date.now()}`.slice(-10) },
            { headers: { Authorization: `Bearer ${userToken}` } }
          ),
        expectOk: false,
      },
      {
        name: "Viewer cannot update external organization",
        fn: () =>
          axios.put(
            `${API_BASE}/external-orgs/${externalOrgId}`,
            { name: "Viewer should not update" },
            { headers: { Authorization: `Bearer ${viewerToken}` } }
          ),
        expectOk: false,
      },
      {
        name: "Cross-tenant viewer cannot read foreign external organization",
        fn: () =>
          axios.get(`${API_BASE}/external-orgs/${externalOrgId}`, {
            headers: { Authorization: `Bearer ${crossTenantToken}` },
          }),
        expectOk: false,
      },
      {
        name: "Cross-tenant viewer cannot read foreign document",
        fn: () =>
          axios.get(`${API_BASE}/documents/${crossTenantDocumentId}`, {
            headers: { Authorization: `Bearer ${crossTenantToken}` },
          }),
        expectOk: false,
      },
    ];

    for (const testCase of cases) {
      let ok = false;
      try {
        const response = await testCase.fn();
        ok = response.status >= 200 && response.status < 300;
      } catch (error) {
        ok = false;
      }

      if (ok !== testCase.expectOk) {
        throw new Error(`Case failed: ${testCase.name} (expected ${testCase.expectOk}, got ${ok})`);
      }
      console.log(`PASS: ${testCase.name}`);
    }

    console.log("Authorization matrix regression: PASSED");
  } catch (error) {
    console.error(`Authorization matrix regression: FAILED - ${error.message}`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

run();
