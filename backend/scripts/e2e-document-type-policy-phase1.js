const { PrismaClient } = require("@prisma/client");
const fetch = require("node-fetch");
const { documentPermissionResolverService } = require("../dist/modules/authorization/document-permission-resolver.service");

const prisma = new PrismaClient();
const API_BASE = "http://localhost:4000/api/v1";

let adminToken = "";
let adminUser = null;
let creatorToken = "";
let creatorUser = null;
let sameDepartmentUser = null;
let outsideDepartmentUser = null;
let documentTypeId = null;
let documentId = null;
let workflowId = null;
let workflowStepId = null;
let legacyDocumentTypeId = null;
let legacyDocumentId = null;

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

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

async function loginCreator() {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: creatorUser.email,
      password: "secret123",
    }),
  });

  const data = await response.json();
  if (!response.ok || !data?.success) {
    throw new Error(`Creator login failed: ${JSON.stringify(data)}`);
  }

  creatorToken = data.data.tokens.accessToken;
  expect(data.data.user.id === creatorUser.id, `Creator login resolved wrong user: ${data.data.user.id}`);
}

async function verifyCreatorIdentity() {
  const response = await fetch(`${API_BASE}/auth/me`, {
    headers: {
      Authorization: `Bearer ${creatorToken}`,
    },
  });

  const data = await response.json();
  if (!response.ok || !data?.success) {
    throw new Error(`Creator /auth/me failed: ${JSON.stringify(data)}`);
  }

  expect(data.data.user.id === creatorUser.id, `Creator token points to wrong user: ${data.data.user.id}`);
}

async function prepareFixtures() {
  adminUser = await prisma.users.findFirst({
    where: { email: "admin@acme.local", status: "active" },
    select: { id: true, tenant_id: true, department_id: true, password_hash: true, position_id: true },
  });

  if (!adminUser || !adminUser.department_id) {
    throw new Error("Admin fixture missing department");
  }

  sameDepartmentUser = await prisma.users.findFirst({
    where: {
      tenant_id: adminUser.tenant_id,
      status: "active",
      id: { not: adminUser.id },
      department_id: adminUser.department_id,
      role: { not: "super_admin" },
    },
    select: { id: true, department_id: true, role: true },
    orderBy: { id: "asc" },
  });

  outsideDepartmentUser = await prisma.users.findFirst({
    where: {
      tenant_id: adminUser.tenant_id,
      status: "active",
      id: { not: adminUser.id },
      department_id: { not: adminUser.department_id },
      role: { not: "super_admin" },
    },
    select: { id: true, department_id: true, role: true },
    orderBy: { id: "asc" },
  });

  if (!sameDepartmentUser || !outsideDepartmentUser) {
    throw new Error("Need users in same and different departments");
  }

  const adminRole = await prisma.roles.findFirst({
    where: { tenant_id: adminUser.tenant_id, name: "Admin" },
    select: { id: true },
  });

  if (!adminRole) {
    throw new Error("Admin role fixture not found");
  }

  creatorUser = await prisma.users.create({
    data: {
      tenant_id: adminUser.tenant_id,
      email: `phase1.creator.${Date.now()}@acme.local`,
      password_hash: adminUser.password_hash,
      full_name: "Phase 1 Creator",
      department_id: adminUser.department_id,
      position_id: adminUser.position_id,
      role: "user",
      status: "active",
    },
    select: { id: true, email: true, department_id: true },
  });

  await prisma.user_roles.create({
    data: {
      user_id: creatorUser.id,
      role_id: adminRole.id,
    },
  });
}

async function createDocumentType() {
  const response = await fetch(`${API_BASE}/document-types`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      code: `PHASE1_${Date.now()}`,
      name: `Phase1 Policy ${Date.now()}`,
      description: "Phase 1 smoke test",
      category: "internal",
      require_numbering: false,
      require_digital_signing: false,
      require_approval: true,
      allow_workflow_override: false,
    }),
  });
  const data = await response.json();
  if (!response.ok || !data?.success) {
    throw new Error(`Create document type failed: ${JSON.stringify(data)}`);
  }
  documentTypeId = data.data.id;
}

async function savePolicy() {
  const response = await fetch(`${API_BASE}/settings/document-type-policy/${documentTypeId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      visibility: {
        default_visibility_scope: "department",
        default_security_level: "confidential",
        auto_assign_creator_department: true,
        force_private_on_create: true,
      },
      acl_templates: [
        {
          id: "creator-1",
          subject_type: "creator",
          permissions: ["VIEW", "DOWNLOAD", "EDIT", "DELETE"],
          scope: "OWN",
          status_limit: ["DRAFT", "REJECTED"],
          is_active: true,
        },
        {
          id: "dept-1",
          subject_type: "specific_department",
          subject_id: adminUser.department_id,
          permissions: ["VIEW", "DOWNLOAD"],
          scope: "DEPARTMENT",
          is_active: true,
        },
      ],
      advanced_policies: [
        {
          id: "deny-conf-1",
          name: "Deny confidential to same department",
          priority: 1,
          effect: "DENY",
          condition_json: {
            security_level: "confidential",
          },
          permission_json: {
            permissions: ["VIEW", "DOWNLOAD"],
          },
          is_active: true,
        },
      ],
    }),
  });

  const data = await response.json();
  if (!response.ok || !data?.success) {
    throw new Error(`Save policy failed: ${JSON.stringify(data)}`);
  }
}

async function createDocument() {
  const response = await fetch(`${API_BASE}/documents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${creatorToken}`,
    },
    body: JSON.stringify({
      file_name: "phase1.txt",
      file_base64: Buffer.from("phase1 smoke test").toString("base64"),
      document_type_id: documentTypeId,
      title: "Phase 1 Permission Snapshot",
      summary: "Smoke test",
    }),
  });

  const data = await response.json();
  if (!response.ok || !data?.success) {
    throw new Error(`Create document failed: ${JSON.stringify(data)}`);
  }
  documentId = data.data.document.id;
}

async function createLegacyDocumentType() {
  const response = await fetch(`${API_BASE}/document-types`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      code: `PHASE1_LEGACY_${Date.now()}`,
      name: `Phase1 Legacy ${Date.now()}`,
      description: "Legacy policy smoke test",
      category: "internal",
      require_numbering: false,
      require_digital_signing: false,
      require_approval: true,
      allow_workflow_override: false,
    }),
  });
  const data = await response.json();
  if (!response.ok || !data?.success) {
    throw new Error(`Create legacy document type failed: ${JSON.stringify(data)}`);
  }
  legacyDocumentTypeId = data.data.id;
}

async function saveLegacyPolicy() {
  const response = await fetch(`${API_BASE}/settings/document-type-policy/${legacyDocumentTypeId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({
      default_visibility_scope: "department",
      default_confidential_level: "normal",
      inherit_creator_department: true,
      force_private_until_completed: false,
      detail_permissions: [
        {
          subject_type: "department",
          subject_id: creatorUser.department_id,
          can_read: true,
        },
      ],
    }),
  });

  const data = await response.json();
  if (!response.ok || !data?.success) {
    throw new Error(`Save legacy policy failed: ${JSON.stringify(data)}`);
  }
}

async function createLegacyDocument() {
  const response = await fetch(`${API_BASE}/documents`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${creatorToken}`,
    },
    body: JSON.stringify({
      file_name: "phase1-legacy.txt",
      file_base64: Buffer.from("phase1 legacy smoke test").toString("base64"),
      document_type_id: legacyDocumentTypeId,
      title: "Phase 1 Legacy Permission Snapshot",
      summary: "Legacy smoke test",
    }),
  });

  const data = await response.json();
  if (!response.ok || !data?.success) {
    throw new Error(`Create legacy document failed: ${JSON.stringify(data)}`);
  }
  legacyDocumentId = data.data.document.id;
}

async function verifySnapshot() {
  const doc = await prisma.documents.findUnique({
    where: { id: documentId },
    select: {
      visibility_scope: true,
      confidential_level: true,
      department_id: true,
      owner_id: true,
    },
  });

  expect(doc, "Document not found after create");
  expect(doc.visibility_scope === "private", `Expected private visibility, got ${doc.visibility_scope}`);
  expect(doc.confidential_level === "confidential", `Expected confidential level, got ${doc.confidential_level}`);
  expect(doc.department_id === creatorUser.department_id, "Expected owner department snapshot");

  const acl = await prisma.document_permissions.findMany({
    where: { document_id: documentId },
    orderBy: { id: "asc" },
  });

  expect(acl.length >= 2, `Expected baseline ACL snapshot entries, got ${acl.length}`);
  expect(acl.some((item) => item.subject_type === "user" && item.subject_id === creatorUser.id), "Expected creator ACL snapshot");
  expect(
    acl.some((item) => item.subject_type === "department" && item.subject_id === creatorUser.department_id),
    "Expected department ACL snapshot"
  );
}

async function verifyEffectivePermissions() {
  const creatorDraft = await documentPermissionResolverService.resolveDocumentPermission(
    creatorUser.id,
    adminUser.tenant_id,
    documentId
  );
  expect(creatorDraft.canEdit === true, "Creator should be able to edit in DRAFT");
  expect(creatorDraft.canDelete === true, "Creator should be able to delete in DRAFT");

  await prisma.documents.update({
    where: { id: documentId },
    data: { status: "submitted" },
  });

  const creatorSubmitted = await documentPermissionResolverService.resolveDocumentPermission(
    creatorUser.id,
    adminUser.tenant_id,
    documentId
  );
  expect(creatorSubmitted.canEdit === false, "Creator edit should be denied when SUBMITTED");
  expect(creatorSubmitted.canDelete === false, "Creator delete should be denied when SUBMITTED");
  expect(
    creatorSubmitted.reasons.some((reason) => reason.includes("creator can only edit")),
    "Expected creator status reason"
  );
  expect(
    creatorSubmitted.reasons.some((reason) => reason.includes("creator can only delete")),
    "Expected creator delete status reason"
  );

  const outsiderDecision = await documentPermissionResolverService.resolveDocumentPermission(
    outsideDepartmentUser.id,
    adminUser.tenant_id,
    documentId
  );
  expect(outsiderDecision.canView === false, "User outside scope should not view document");

  const sameDepartmentDecision = await documentPermissionResolverService.resolveDocumentPermission(
    sameDepartmentUser.id,
    adminUser.tenant_id,
    documentId
  );
  expect(sameDepartmentDecision.canView === false, "DENY advanced policy should override department ALLOW");
}

async function verifyWorkflowParticipantCanView() {
  const workflow = await prisma.workflows.create({
    data: {
      tenant_id: adminUser.tenant_id,
      name: `Phase1 Workflow ${Date.now()}`,
      description: "Workflow participant permission test",
      document_type_id: legacyDocumentTypeId,
      is_template: true,
      is_active: true,
      created_by: adminUser.id,
    },
    select: { id: true },
  });
  workflowId = workflow.id;

  const workflowStep = await prisma.workflow_steps.create({
    data: {
      workflow_id: workflow.id,
      step_order: 1,
      step_name: "Approve",
      approver_type: "user",
      approver_id: outsideDepartmentUser.id,
      assignee_type: "specific_user",
      assignee_user_id: outsideDepartmentUser.id,
      completion_mode: "all",
      participant_role: "approver",
      due_in_days: 3,
      is_required: true,
      is_parallel: false,
    },
    select: { id: true },
  });
  workflowStepId = workflowStep.id;

  await prisma.document_approvals.create({
    data: {
      document_id: legacyDocumentId,
      workflow_id: workflow.id,
      workflow_step_id: workflowStep.id,
      approver_user_id: outsideDepartmentUser.id,
      action: "pending",
    },
  });

  const participantDecision = await documentPermissionResolverService.resolveDocumentPermission(
    outsideDepartmentUser.id,
    adminUser.tenant_id,
    legacyDocumentId
  );

  expect(participantDecision.canView === true, "Workflow participant should be able to view");
  expect(participantDecision.canDownload === true, "Workflow participant should be able to download");
  expect(
    participantDecision.reasons.some((reason) => reason.includes("workflow participant")),
    "Expected workflow participant reason"
  );
}

async function verifyLegacyPolicyStillWorks() {
  const response = await fetch(`${API_BASE}/settings/document-type-policy/${legacyDocumentTypeId}`, {
    headers: {
      Authorization: `Bearer ${adminToken}`,
    },
  });
  const data = await response.json();
  if (!response.ok || !data?.success) {
    throw new Error(`Get legacy policy failed: ${JSON.stringify(data)}`);
  }

  expect(Array.isArray(data.data.acl_templates), "Legacy policy should be normalized to acl_templates");
  expect(data.data.acl_templates.length > 0, "Legacy policy should expose acl_templates after normalization");

  const legacyDoc = await prisma.documents.findUnique({
    where: { id: legacyDocumentId },
    select: {
      visibility_scope: true,
      confidential_level: true,
      department_id: true,
      owner_id: true,
    },
  });

  expect(legacyDoc, "Legacy document not found");
  expect(legacyDoc.visibility_scope === "department", `Expected legacy visibility department, got ${legacyDoc.visibility_scope}`);
  expect(legacyDoc.department_id === creatorUser.department_id, "Expected legacy owner department snapshot");

  const acl = await prisma.document_permissions.findMany({
    where: { document_id: legacyDocumentId },
    orderBy: { id: "asc" },
  });

  expect(
    acl.some((item) => item.subject_type === "department" && item.subject_id === creatorUser.department_id && item.can_read === true),
    "Expected legacy department ACL snapshot"
  );
}

async function cleanup() {
  try {
    if (documentId) {
      await prisma.audit_logs.deleteMany({ where: { document_id: documentId } });
      await prisma.document_approvals.deleteMany({ where: { document_id: documentId } });
      await prisma.document_cc_emails.deleteMany({ where: { document_id: documentId } });
      await prisma.document_permissions.deleteMany({ where: { document_id: documentId } });
      await prisma.documents.deleteMany({ where: { id: documentId } });
    }
    if (legacyDocumentId) {
      await prisma.audit_logs.deleteMany({ where: { document_id: legacyDocumentId } });
      await prisma.document_approvals.deleteMany({ where: { document_id: legacyDocumentId } });
      await prisma.document_cc_emails.deleteMany({ where: { document_id: legacyDocumentId } });
      await prisma.document_permissions.deleteMany({ where: { document_id: legacyDocumentId } });
      await prisma.documents.deleteMany({ where: { id: legacyDocumentId } });
    }
    if (workflowId) {
      await prisma.workflow_instances.deleteMany({ where: { workflow_id: workflowId } });
      await prisma.workflow_steps.deleteMany({ where: { workflow_id: workflowId } });
      await prisma.workflows.deleteMany({ where: { id: workflowId } });
    }
    if (creatorUser?.id) {
      await prisma.user_roles.deleteMany({ where: { user_id: creatorUser.id } });
      await prisma.users.deleteMany({ where: { id: creatorUser.id } });
    }
    if (documentTypeId) {
      await prisma.tenant_settings.deleteMany({
        where: {
          tenant_id: adminUser.tenant_id,
          setting_key: `doc_type_policy:${documentTypeId}`,
        },
      });
      await prisma.document_types.deleteMany({ where: { id: documentTypeId } });
    }
    if (legacyDocumentTypeId) {
      await prisma.tenant_settings.deleteMany({
        where: {
          tenant_id: adminUser.tenant_id,
          setting_key: `doc_type_policy:${legacyDocumentTypeId}`,
        },
      });
      await prisma.document_types.deleteMany({ where: { id: legacyDocumentTypeId } });
    }
  } catch (error) {
    console.warn("Cleanup warning:", error.message || error);
  }
  await prisma.$disconnect();
}

async function main() {
  try {
    console.log("\n=== E2E Document Type Policy Phase 1 ===");
    await login();
    await prepareFixtures();
    await loginCreator();
    await verifyCreatorIdentity();
    await createDocumentType();
    await savePolicy();
    await createDocument();
    console.log("1. force_private_on_create + snapshot fields");
    await verifySnapshot();
    console.log("2. creator edit status gating + outside scope deny + DENY override ALLOW");
    await verifyEffectivePermissions();
    await createLegacyDocumentType();
    await saveLegacyPolicy();
    await createLegacyDocument();
    console.log("3. workflow participant can view");
    await verifyWorkflowParticipantCanView();
    console.log("4. legacy policy still works");
    await verifyLegacyPolicyStillWorks();
    console.log("PASS: document type policy phase1 E2E");
  } finally {
    await cleanup();
  }
}

main().catch((error) => {
  console.error("FAIL:", error);
  process.exit(1);
});
