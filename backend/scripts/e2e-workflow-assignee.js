const axios = require("axios");
const bcrypt = require("bcrypt");
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
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "admin@acme.local";
const ASSIGNEE_TYPE = process.env.E2E_ASSIGNEE_TYPE || "position_in_department";
const COMPLETION_MODE = process.env.E2E_COMPLETION_MODE || "any_one";
const MIN_REQUIRED = Number(process.env.E2E_MIN_REQUIRED || "1");
const CASE_LABEL = process.env.E2E_CASE_LABEL || `${ASSIGNEE_TYPE}-${COMPLETION_MODE}`;
const DIRECT_MANAGER_EMAIL = process.env.E2E_DIRECT_MANAGER_EMAIL || "manager@acme.local";
const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
if (!E2E_ADMIN_PASSWORD) {
  throw new Error("E2E_ADMIN_PASSWORD is required; this script must not try shared default passwords");
}
const E2E_PEER_PASSWORD = process.env.E2E_PEER_PASSWORD || E2E_ADMIN_PASSWORD;

const PNG_SIGNATURE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const MINIMAL_PDF_BASE64 =
  "JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL1Jlc291cmNlczw8L0ZvbnQ8PC9GMSA1IDAgUj4+Pj4vTWVkaWFCb3hbMCAwIDYxMiA3OTJdL0NvbnRlbnRzIDQgMCBSPj4KZW5kb2JqCjQgMCBvYmoKPDwvTGVuZ3RoIDQ0Pj4Kc3RyZWFtCkJUCi9GMSA0OCBUZgoxMCA3MDAgVGQKKFRlc3QpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PgplbmRvYmoKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKNSAwIG9iago8PC9UeXBlL0ZvbnQvU3VidHlwZS9UeXBlMS9CYXNlRm9udC9IZWx2ZXRpY2E+PgplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmDQowMDAwMDAwMjczIDAwMDAwIG4NCjAwMDAwMDAyMjQgMDAwMDAgbg0KMDAwMDAwMDAxNSAwMDAwMCBuDQowMDAwMDAwMTI1IDAwMDAwIG4NCjAwMDAwMDAzMjIgMDAwMDAgbg0KdHJhaWxlcgo8PC9TaXplIDYvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgo0MDIKJSVFT0YK";

async function loginWithEmail(email) {
  const response = await axios.post(`${API_BASE}/auth/login`, {
    email,
    password: E2E_ADMIN_PASSWORD,
  });
  return { token: response.data.data.tokens.accessToken, password: E2E_ADMIN_PASSWORD, email };
}

async function login() {
  return loginWithEmail(ADMIN_EMAIL);
}

async function ensurePeerUser(adminUser) {
  const peerEmail = "workflow-peer@acme.local";
  let peer = await prisma.users.findFirst({
    where: {
      tenant_id: adminUser.tenant_id,
      email: peerEmail,
    },
    select: { id: true, email: true, full_name: true },
  });

  if (peer) return peer;

  const passwordHash = await bcrypt.hash(E2E_PEER_PASSWORD, 10);
  peer = await prisma.users.create({
    data: {
      tenant_id: adminUser.tenant_id,
      email: peerEmail,
      password_hash: passwordHash,
      full_name: "Workflow Peer",
      department_id: adminUser.department_id,
      position_id: adminUser.position_id,
      manager_id: adminUser.manager_id,
      role: "user",
      status: "active",
    },
    select: { id: true, email: true, full_name: true },
  });

  return peer;
}

async function syncAdminRolesToPeer(adminUserId, peerUserId) {
  const adminRoles = await prisma.user_roles.findMany({
    where: { user_id: adminUserId },
    select: { role_id: true },
  });

  if (!adminRoles.length) return;

  for (const adminRole of adminRoles) {
    await prisma.user_roles.upsert({
      where: {
        user_id_role_id: {
          user_id: peerUserId,
          role_id: adminRole.role_id,
        },
      },
      update: {},
      create: {
        user_id: peerUserId,
        role_id: adminRole.role_id,
      },
    });
  }
}

async function ensureDocType(tenantId, workflowId) {
  const docType = await prisma.document_types.upsert({
    where: {
      tenant_id_code: {
        tenant_id: tenantId,
        code: "E2E_ASSIGNEE_FLOW",
      },
    },
    update: {
      name: "E2E Assignee Flow",
      require_digital_signing: true,
      require_approval: true,
      allow_workflow_override: false,
      default_workflow_id: workflowId,
      is_active: true,
    },
    create: {
      tenant_id: tenantId,
      code: "E2E_ASSIGNEE_FLOW",
      name: "E2E Assignee Flow",
      description: "E2E assignee completion workflow",
      require_numbering: true,
      require_digital_signing: true,
      require_approval: true,
      allow_workflow_override: false,
      default_workflow_id: workflowId,
      is_active: true,
    },
  });

  await prisma.numbering_rules.upsert({
    where: {
      tenant_id_document_type_id: {
        tenant_id: tenantId,
        document_type_id: docType.id,
      },
    },
    update: {
      pattern: "{TYPE}-{YEAR}-{AUTO}",
      reset_yearly: true,
      is_active: true,
    },
    create: {
      tenant_id: tenantId,
      document_type_id: docType.id,
      pattern: "{TYPE}-{YEAR}-{AUTO}",
      reset_yearly: true,
      last_number: 0,
      is_active: true,
    },
  });

  return docType;
}

async function run() {
  const { token, password } = await login();
  console.log(`[${CASE_LABEL}] Logged in as ${ADMIN_EMAIL} with password ${password}`);

  const headers = { Authorization: `Bearer ${token}` };
  const meResponse = await axios.get(`${API_BASE}/auth/me`, { headers });
  const me = meResponse.data.data.user;
  const tenant = meResponse.data.data.tenant;
  let adminUser = await prisma.users.findUnique({ where: { id: me.id } });

  if (!adminUser?.department_id || !adminUser?.position_id) {
    const [department, position] = await Promise.all([
      prisma.departments.findFirst({
        where: { tenant_id: tenant.id },
        select: { id: true },
        orderBy: { id: "asc" },
      }),
      prisma.positions.findFirst({
        where: { tenant_id: tenant.id },
        select: { id: true },
        orderBy: { id: "asc" },
      }),
    ]);

    if (!department || !position) {
      throw new Error("Tenant must have at least one department and one position for this E2E");
    }

    adminUser = await prisma.users.update({
      where: { id: me.id },
      data: {
        department_id: adminUser?.department_id || department.id,
        position_id: adminUser?.position_id || position.id,
      },
    });
  }

  const peer = await ensurePeerUser(adminUser);
  await syncAdminRolesToPeer(adminUser.id, peer.id);
  console.log(`[${CASE_LABEL}] Using peer user ${peer.email}`);

  if (ASSIGNEE_TYPE === "department_manager") {
    await prisma.departments.update({
      where: { id: adminUser.department_id },
      data: { manager_id: adminUser.id },
    });
  }

  if (ASSIGNEE_TYPE === "direct_manager") {
    adminUser = await prisma.users.update({
      where: { id: adminUser.id },
      data: { manager_id: peer.id },
    });
  }

  const workflowResponse = await axios.post(
    `${API_BASE}/workflows`,
    {
      name: `E2E Assignee ${Date.now()}`,
      description: `Workflow using ${ASSIGNEE_TYPE} + ${COMPLETION_MODE}`,
    },
    { headers },
  );
  const workflow = workflowResponse.data.data.workflow;

  const stepPayload = {
    step_name: `Approval by ${ASSIGNEE_TYPE}`,
    assignee_type: ASSIGNEE_TYPE,
    completion_mode: COMPLETION_MODE,
    participant_role: "approver",
  };

  if (ASSIGNEE_TYPE === "position_in_department") {
    stepPayload.assignee_department_id = adminUser.department_id;
    stepPayload.assignee_position_id = adminUser.position_id;
  } else if (ASSIGNEE_TYPE === "specific_user") {
    stepPayload.assignee_user_id = adminUser.id;
  } else if (ASSIGNEE_TYPE === "department_manager") {
    stepPayload.assignee_department_id = adminUser.department_id;
  }

  if (COMPLETION_MODE === "min_n") {
    stepPayload.min_required = MIN_REQUIRED;
  }

  await axios.post(`${API_BASE}/workflows/${workflow.id}/steps`, stepPayload, { headers });
  console.log(`[${CASE_LABEL}] Created workflow step`);

  const docType = await ensureDocType(tenant.id, workflow.id);
  const createDocumentResponse = await axios.post(
    `${API_BASE}/documents`,
    {
      title: `E2E Assignee Document ${Date.now()}`,
      document_type_id: docType.id,
      require_digital_signing: true,
      file_name: `e2e-assignee-${Date.now()}.pdf`,
      file_base64: MINIMAL_PDF_BASE64,
      mime_type: "application/pdf",
    },
    { headers },
  );

  const document = createDocumentResponse.data.data.document;
  let signRequestId = document.sign_request_id;
  if (!signRequestId) {
    const createSignRequestResponse = await axios.post(
      `${API_BASE}/sign-requests`,
      {
        document_id: document.id,
        title: `E2E Assignee SR ${Date.now()}`,
        message: "Created by e2e-workflow-assignee",
        workflow_type: "sequential",
        signers: [{ email: ADMIN_EMAIL, name: me.full_name || me.email, role: "signer" }],
      },
      { headers },
    );
    signRequestId = createSignRequestResponse.data.data.sign_request.id;
    await prisma.documents.update({
      where: { id: document.id },
      data: { sign_request_id: signRequestId },
    });
  }

  const signRequestResponse = await axios.get(`${API_BASE}/sign-requests/${signRequestId}`, { headers });
  let signer = signRequestResponse.data.data.sign_request.signers.find((item) => item.email === ADMIN_EMAIL);
  if (!signer) {
    signer = await prisma.signers.create({
      data: {
        sign_request_id: signRequestId,
        user_id: me.id,
        email: ADMIN_EMAIL,
        name: me.full_name || me.email,
        role: "signer",
        signing_order: 1,
        is_internal: true,
        status: "pending",
      },
    });
  }

  await axios.post(
    `${API_BASE}/sign-requests/${signRequestId}/fields`,
    {
      fields: [
        {
          assigned_signer_id: signer.id,
          type: "signature",
          pageIndex: 0,
          xPct: 0.12,
          yPct: 0.72,
          widthPct: 0.26,
          heightPct: 0.08,
          required: true,
          label: "E2E Signature",
        },
      ],
    },
    { headers },
  );

  await axios.post(`${API_BASE}/sign-requests/${signRequestId}/send`, {}, { headers });
  console.log(`[${CASE_LABEL}] Submitted sign request ${signRequestId}`);

  const approvals = await prisma.document_approvals.findMany({
    where: { document_id: document.id },
    include: { approver: { select: { email: true } } },
  });

  const expectedApprovalCount =
    ASSIGNEE_TYPE === "position_in_department"
      ? 2
      : 1;
  if (approvals.length < expectedApprovalCount) {
    throw new Error(`Expected at least ${expectedApprovalCount} approval records, got ${approvals.length}`);
  }
  console.log(`[${CASE_LABEL}] Approval records created: ${approvals.map((item) => item.approver.email).join(", ")}`);

  let actingHeaders = headers;
  let actingApproverEmail = ADMIN_EMAIL;
  let myPendingResponse = await axios.get(`${API_BASE}/approvals/my-pending`, { headers });
  let approval = (myPendingResponse.data.data.approvals || []).find((item) => item.document?.id === document.id);

  if (!approval) {
    const firstApproverEmail = approvals.find((item) => item.approver?.email)?.approver?.email;
    if (!firstApproverEmail) {
      throw new Error("No approver email resolved for this document");
    }
    const approverLogin = await loginWithEmail(firstApproverEmail);
    actingApproverEmail = firstApproverEmail;
    actingHeaders = { Authorization: `Bearer ${approverLogin.token}` };
    myPendingResponse = await axios.get(`${API_BASE}/approvals/my-pending`, { headers: actingHeaders });
    approval = (myPendingResponse.data.data.approvals || []).find((item) => item.document?.id === document.id);
  }

  if (!approval) {
    throw new Error("Pending approval not found for acting approver");
  }

  await axios.post(
    `${API_BASE}/approvals/${approval.id}/approve`,
    {
      comment: `Approved by ${actingApproverEmail} for ${CASE_LABEL}`,
      signature_data: PNG_SIGNATURE,
      signature_type: "drawn",
    },
    { headers: actingHeaders },
  );
  console.log(`[${CASE_LABEL}] First approval completed by ${actingApproverEmail}`);

  const refreshedApprovals = await prisma.document_approvals.findMany({
    where: { document_id: document.id },
    include: { approver: { select: { email: true } } },
  });
  const signRequestAfterFirstApproval = await axios.get(`${API_BASE}/sign-requests/${signRequestId}`, { headers });
  const flowStateAfterFirstApproval = signRequestAfterFirstApproval.data.data.sign_request.flow_state;

  if (COMPLETION_MODE === "any_one" && ASSIGNEE_TYPE === "position_in_department") {
    const skippedCount = refreshedApprovals.filter((item) => item.action === "skipped").length;
    if (skippedCount < 1) {
      throw new Error("Expected at least one skipped approval after any_one completion");
    }
  }

  if (COMPLETION_MODE === "min_n") {
    if (flowStateAfterFirstApproval !== "AWAITING_APPROVAL") {
      throw new Error(`Expected AWAITING_APPROVAL after first approval for min_n, got ${flowStateAfterFirstApproval}`);
    }

    const secondApprover =
      refreshedApprovals.find(
        (item) => item.approver.email === "workflow-peer@acme.local" && item.action === "pending",
      ) ||
      refreshedApprovals.find(
        (item) => item.approver.email && item.approver.email !== ADMIN_EMAIL && item.action === "pending",
      );
    if (!secondApprover?.approver?.email) {
      throw new Error("Expected a second pending approver for min_n case");
    }

    const secondLogin = await loginWithEmail(secondApprover.approver.email);
    const secondHeaders = { Authorization: `Bearer ${secondLogin.token}` };
    const secondPending = await axios.get(`${API_BASE}/approvals/my-pending`, { headers: secondHeaders });
    const secondApproval = (secondPending.data.data.approvals || []).find((item) => item.document?.id === document.id);
    if (!secondApproval) {
      throw new Error(`Pending approval not found for ${secondApprover.approver.email}`);
    }

    await axios.post(
      `${API_BASE}/approvals/${secondApproval.id}/approve`,
      {
        comment: `Approved by ${secondApprover.approver.email} for min_n E2E`,
        signature_data: PNG_SIGNATURE,
        signature_type: "drawn",
      },
      { headers: secondHeaders },
    );
    console.log(`[${CASE_LABEL}] Second approval completed by ${secondApprover.approver.email}`);
  }

  const signRequestAfterApproval = await axios.get(`${API_BASE}/sign-requests/${signRequestId}`, { headers });
  const flowState = signRequestAfterApproval.data.data.sign_request.flow_state;
  if (flowState !== "AWAITING_SIGNATURES") {
    throw new Error(`Expected AWAITING_SIGNATURES after approval, got ${flowState}`);
  }

  await axios.post(
    `${API_BASE}/sign-requests/${signRequestId}/sign-internal`,
    {
      signature_data: PNG_SIGNATURE,
      signature_type: "drawn",
    },
    { headers },
  );
  console.log(`[${CASE_LABEL}] Admin internal signing completed`);

  const finalSignRequest = await axios.get(`${API_BASE}/sign-requests/${signRequestId}`, { headers });
  const finalStatus = finalSignRequest.data.data.sign_request.status;
  if (finalStatus !== "completed") {
    throw new Error(`Expected completed sign request, got ${finalStatus}`);
  }

  console.log(`[${CASE_LABEL}] E2E assignee flow passed`);
}

run()
  .catch((error) => {
    console.error(`[${CASE_LABEL}] E2E assignee flow failed`);
    if (error.response?.data) {
      console.error(JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error);
    }
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
