const axios = require("axios");
const { PrismaClient } = require("@prisma/client");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env"), override: false });
dotenv.config({ path: path.resolve(__dirname, "../../.env.compose"), override: false });
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes("@db:")) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace("@db:", "@localhost:");
}

const prisma = new PrismaClient();

const API_BASE = process.env.E2E_API_BASE || "http://localhost:4000/api/v1";
const PUBLIC_BASE = process.env.E2E_PUBLIC_BASE || "http://localhost:4000/public";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "admin@acme.local";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || "secret123";
const INTERNAL_SIGNER_EMAIL = process.env.E2E_INTERNAL_SIGNER_EMAIL || "admin@acme.local";

const PNG_SIGNATURE =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
const MINIMAL_PDF_BASE64 =
  "JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL1Jlc291cmNlczw8L0ZvbnQ8PC9GMSA1IDAgUj4+Pj4vTWVkaWFCb3hbMCAwIDYxMiA3OTJdL0NvbnRlbnRzIDQgMCBSPj4KZW5kb2JqCjQgMCBvYmoKPDwvTGVuZ3RoIDQ0Pj4Kc3RyZWFtCkJUCi9GMSA0OCBUZgoxMCA3MDAgVGQKKFRlc3QpIFRqCkVUCmVuZHN0cmVhbQplbmRvYmoKMiAwIG9iago8PC9UeXBlL1BhZ2VzL0tpZHNbMyAwIFJdL0NvdW50IDE+PgplbmRvYmoKMSAwIG9iago8PC9UeXBlL0NhdGFsb2cvUGFnZXMgMiAwIFI+PgplbmRvYmoKNSAwIG9iago8PC9UeXBlL0ZvbnQvU3VidHlwZS9UeXBlMS9CYXNlRm9udC9IZWx2ZXRpY2E+PgplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmDQowMDAwMDAwMjczIDAwMDAwIG4NCjAwMDAwMDAyMjQgMDAwMDAgbg0KMDAwMDAwMDAxNSAwMDAwMCBuDQowMDAwMDAwMTI1IDAwMDAwIG4NCjAwMDAwMDAzMjIgMDAwMDAgbg0KdHJhaWxlcgo8PC9TaXplIDYvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgo0MDIKJSVFT0YK";

async function login(email, password) {
  const response = await axios.post(`${API_BASE}/auth/login`, { email, password });
  return response.data.data.tokens.accessToken;
}

async function ensureApprovalWorkflowAndDocType(tenantId, adminUserId) {
  const workflow = await prisma.workflows.create({
    data: {
      tenant_id: tenantId,
      name: `E2E Flow - Approval Step ${Date.now()}`,
      description: "Deterministic one-step approval workflow for E2E",
      is_active: true,
      is_template: true,
      created_by: adminUserId,
    },
  });
  await prisma.workflow_steps.create({
    data: {
      workflow_id: workflow.id,
      step_order: 1,
      step_name: "Admin approval",
      approver_type: "user",
      approver_id: adminUserId,
      participant_role: "approver",
      due_in_days: 3,
      is_required: true,
      is_parallel: false,
    },
  });

  const docType = await prisma.document_types.upsert({
    where: {
      tenant_id_code: {
        tenant_id: tenantId,
        code: "E2E_APPROVAL_SIGN",
      },
    },
    update: {
      name: "E2E Approval + Signing",
      require_digital_signing: true,
      require_approval: true,
      allow_workflow_override: false,
      default_workflow_id: workflow.id,
      is_active: true,
    },
    create: {
      tenant_id: tenantId,
      code: "E2E_APPROVAL_SIGN",
      name: "E2E Approval + Signing",
      description: "E2E deterministic document type",
      require_numbering: true,
      require_digital_signing: true,
      require_approval: true,
      allow_workflow_override: false,
      default_workflow_id: workflow.id,
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

  return { workflow, docType };
}

async function run() {
  let token;
  try {
    console.log("== E2E Workflow Refactor ==");
    token = await login(ADMIN_EMAIL, ADMIN_PASSWORD);

    const meResponse = await axios.get(`${API_BASE}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const me = meResponse.data.data.user;
    const tenant = meResponse.data.data.tenant;
    const tenantId = tenant.id;
    const userId = me.id;
    console.log(`Logged in as ${me.email} (tenant ${tenantId})`);

    const { docType } = await ensureApprovalWorkflowAndDocType(tenantId, userId);

    const createDocumentResponse = await axios.post(
      `${API_BASE}/documents`,
      {
        title: `E2E Flow ${Date.now()}`,
        document_type_id: docType.id,
        require_digital_signing: true,
        file_name: `e2e-${Date.now()}.pdf`,
        file_base64: MINIMAL_PDF_BASE64,
        mime_type: "application/pdf",
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const document = createDocumentResponse.data.data.document;
    let signRequestId = document.sign_request_id;
    if (!signRequestId) {
      const createSignRequestResponse = await axios.post(
        `${API_BASE}/sign-requests`,
        {
          document_id: document.id,
          title: `E2E SR ${Date.now()}`,
          message: "Created by e2e-workflow-refactor script",
          workflow_type: "sequential",
          signers: [{ email: INTERNAL_SIGNER_EMAIL, name: "Internal E2E Signer", role: "signer" }],
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      signRequestId = createSignRequestResponse.data.data.sign_request.id;
      await prisma.documents.update({
        where: { id: document.id },
        data: { sign_request_id: signRequestId },
      });
    }
    console.log(`Document ${document.id} created with sign request ${signRequestId}`);

    const signRequestResponse = await axios.get(`${API_BASE}/sign-requests/${signRequestId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const signRequest = signRequestResponse.data.data.sign_request;
    const signer = signRequest.signers.find((item) => item.email === INTERNAL_SIGNER_EMAIL);
    if (!signer) {
      throw new Error("Expected internal signer to be present");
    }

    await axios.post(
      `${API_BASE}/sign-requests/${signRequestId}/fields`,
      {
        fields: [
          {
            assigned_signer_id: signer.id,
            type: "signature",
            page: 1,
            x: 12,
            y: 72,
            width: 26,
            height: 8,
            required: true,
            label: "E2E Signature",
          },
        ],
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log("Signer and signature field configured");

    const sendResponse = await axios.post(
      `${API_BASE}/sign-requests/${signRequestId}/send`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const sent = sendResponse.data.data.sign_request;
    if (sent.flow_state !== "AWAITING_APPROVAL") {
      throw new Error(`Expected AWAITING_APPROVAL after submit, got ${sent.flow_state}`);
    }
    console.log("Submit -> AWAITING_APPROVAL");

    const pendingApprovalsResponse = await axios.get(`${API_BASE}/approvals/my-pending`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const approvals = pendingApprovalsResponse.data.data.approvals || [];
    const approval = approvals.find((item) => item.document?.id === document.id);
    if (!approval) {
      throw new Error("Expected pending approval record");
    }

    await axios.post(
      `${API_BASE}/approvals/${approval.id}/approve`,
      {
        comment: "Approved in E2E flow",
        signature_data: PNG_SIGNATURE,
        signature_type: "drawn",
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log("Approval completed");

    let pendingSigning;
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const stateResponse = await axios.get(`${API_BASE}/sign-requests/${signRequestId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      pendingSigning = stateResponse.data.data.sign_request;
      if (pendingSigning.flow_state === "AWAITING_SIGNATURES") {
        break;
      }

      if (pendingSigning.flow_state === "AWAITING_APPROVAL") {
        await axios.post(
          `${API_BASE}/sign-requests/${signRequestId}/send`,
          {},
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    if (pendingSigning.flow_state !== "AWAITING_SIGNATURES") {
      throw new Error(`Expected AWAITING_SIGNATURES, got ${pendingSigning.flow_state}`);
    }
    console.log("Approval -> AWAITING_SIGNATURES");

    const detailAfterSend = await axios.get(`${API_BASE}/sign-requests/${signRequestId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const internalSigner = detailAfterSend.data.data.sign_request.signers.find((item) => item.email === INTERNAL_SIGNER_EMAIL);
    if (!internalSigner) {
      throw new Error("Expected internal signer after approval");
    }

    await axios.post(
      `${API_BASE}/sign-requests/${signRequestId}/sign-internal`,
      {
        signature_data: PNG_SIGNATURE,
        field_signatures: {
          [String(detailAfterSend.data.data.sign_request.fields[0].id)]: PNG_SIGNATURE,
        },
        signature_type: "drawn",
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    console.log("Internal signing completed");

    const finalStateResponse = await axios.get(`${API_BASE}/sign-requests/${signRequestId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const finalState = finalStateResponse.data.data.sign_request;
    if (finalState.flow_state !== "COMPLETED") {
      throw new Error(`Expected COMPLETED, got ${finalState.flow_state}`);
    }
    console.log("Flow -> COMPLETED");

    const downloadResponse = await axios.get(
      `${API_BASE}/documents/${document.id}/download-signed`,
      {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "arraybuffer",
      }
    );
    if (!downloadResponse.data || downloadResponse.data.byteLength === 0) {
      throw new Error("Signed artifact download is empty");
    }
    console.log(`Signed artifact downloaded (${downloadResponse.data.byteLength} bytes)`);

    const auditCount = await prisma.audit_logs.count({
      where: {
        document_id: document.id,
      },
    });
    if (auditCount === 0) {
      throw new Error("Expected audit events for document flow");
    }
    console.log(`Audit events recorded: ${auditCount}`);

    console.log("E2E workflow refactor test: PASSED");
  } catch (error) {
    const msg = error.response?.data ? JSON.stringify(error.response.data) : error.message;
    console.error(`E2E workflow refactor test: FAILED - ${msg}`);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

run();
