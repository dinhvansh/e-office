const axios = require("axios");
const { PrismaClient } = require("@prisma/client");
const path = require("path");
const fs = require("fs/promises");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env"), override: false });
dotenv.config({ path: path.resolve(__dirname, "../../.env.compose"), override: false });
if (process.env.E2E_USE_LOCAL_DB === "1" && process.env.DATABASE_URL && process.env.DATABASE_URL.includes("@db:")) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace("@db:", "@localhost:");
}

const prisma = new PrismaClient();

const API_BASE = process.env.E2E_API_BASE || "http://localhost:4000/api/v1";
const PUBLIC_BASE = process.env.E2E_PUBLIC_BASE || "http://localhost:4000/public";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || "admin@acme.local";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
const INTERNAL_SIGNER_EMAIL = process.env.E2E_INTERNAL_SIGNER_EMAIL || "admin@acme.local";

if (!ADMIN_PASSWORD) {
  throw new Error("E2E_ADMIN_PASSWORD is required; do not rely on a shared demo password");
}

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

    const packageFailureMarker = `e2e-package-rollback-${Date.now()}`;
    const packageFailureFile = `${packageFailureMarker}.pdf`;
    let packageFailureError;
    try {
      await axios.post(
        `${API_BASE}/documents`,
        {
          title: packageFailureMarker,
          file_name: packageFailureFile,
          file_base64: MINIMAL_PDF_BASE64,
          mime_type: "application/pdf",
          create_sign_request: true,
          customized_steps: [{
            step_name: "Forced package failure",
            approver_type: "user",
            approver_id: userId,
            due_in_days: 1,
          }],
        },
        { headers: { Authorization: `Bearer ${token}` } },
      );
    } catch (error) {
      packageFailureError = error;
    }
    if (packageFailureError?.response?.data?.error?.code !== "WORKFLOW_TEMPLATE_REQUIRED") {
      throw new Error(`Expected package creation failure, got ${packageFailureError?.response?.status || "success"}`);
    }
    const [orphanDocumentCount, orphanSignRequestCount, orphanPermissionCount] = await Promise.all([
      prisma.documents.count({ where: { tenant_id: tenantId, title: packageFailureMarker } }),
      prisma.sign_requests.count({ where: { document: { tenant_id: tenantId, title: packageFailureMarker } } }),
      prisma.document_permissions.count({ where: { document: { tenant_id: tenantId, title: packageFailureMarker } } }),
    ]);
    const storageDirectory = path.resolve(process.cwd(), "storage", String(tenantId));
    const storageEntries = await fs.readdir(storageDirectory).catch(() => []);
    const leftoverUploads = storageEntries.filter((entry) => entry.endsWith(`_${packageFailureFile}`));
    if (orphanDocumentCount !== 0 || orphanSignRequestCount !== 0 || orphanPermissionCount !== 0 || leftoverUploads.length !== 0) {
      throw new Error(`Package rollback left orphans: documents=${orphanDocumentCount}, signRequests=${orphanSignRequestCount}, permissions=${orphanPermissionCount}, uploads=${leftoverUploads.length}`);
    }
    console.log("Failed package creation left no document, sign request, ACL, or upload orphan");

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

    // Document creation may auto-create a draft sign request without signers.
    // Ensure this deterministic E2E fixture always has its internal signer.
    let fixtureSigner = await prisma.signers.findFirst({
      where: { sign_request_id: signRequestId, email: INTERNAL_SIGNER_EMAIL },
    });
    if (!fixtureSigner) {
      const internalUser = await prisma.users.findUnique({
        where: { email: INTERNAL_SIGNER_EMAIL },
        select: { id: true, email: true, full_name: true },
      });
      if (!internalUser) throw new Error("Expected E2E internal signer user");
      fixtureSigner = await prisma.signers.create({
        data: {
          sign_request_id: signRequestId,
          user_id: internalUser.id,
          email: internalUser.email,
          name: internalUser.full_name || internalUser.email,
          role: "signer",
          signing_order: 1,
          is_internal: true,
          status: "draft",
        },
      });
    }
    const persistedFixtureSigner = await prisma.signers.findFirst({
      where: { id: fixtureSigner.id, sign_request_id: signRequestId },
      select: { id: true, email: true, status: true },
    });
    if (!persistedFixtureSigner) {
      throw new Error(`Internal signer fixture was not persisted for sign request ${signRequestId}`);
    }
    console.log(`Document ${document.id} created with sign request ${signRequestId}`);

    const signRequestResponse = await axios.get(`${API_BASE}/sign-requests/${signRequestId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const signRequest = signRequestResponse.data.data.sign_request;
    const signer = signRequest.signers.find((item) => item.email === INTERNAL_SIGNER_EMAIL);
    if (!signer) {
      throw new Error(`Expected internal signer ${persistedFixtureSigner.id} to be present in sign request ${signRequestId}`);
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

    const approvalPayload = {
      comment: "Approved in E2E flow",
      signature_data: PNG_SIGNATURE,
      signature_type: "drawn",
    };
    const approvalConfig = { headers: { Authorization: `Bearer ${token}` } };
    const [firstApproval, duplicateApproval] = await Promise.allSettled([
      axios.post(`${API_BASE}/approvals/${approval.id}/approve`, approvalPayload, approvalConfig),
      axios.post(`${API_BASE}/approvals/${approval.id}/approve`, approvalPayload, approvalConfig),
    ]);
    const successfulApprovals = [firstApproval, duplicateApproval].filter((result) => result.status === "fulfilled");
    const rejectedApprovals = [firstApproval, duplicateApproval].filter((result) => result.status === "rejected");
    if (successfulApprovals.length !== 1 || rejectedApprovals.length !== 1) {
      throw new Error("Expected exactly one successful approval request and one rejected duplicate");
    }
    const duplicateApprovalError = rejectedApprovals[0].reason;
    if (![400, 409].includes(duplicateApprovalError.response?.status)) {
      throw new Error(`Expected duplicate approval to return 400 or 409, got ${duplicateApprovalError.response?.status || duplicateApprovalError.message}`);
    }
    const [workflowCompletionCount, approvalCompletionOutboxCount] = await Promise.all([
      prisma.workflow_instances.count({ where: { document_id: document.id, status: "completed" } }),
      prisma.outbox_events.count({
        where: {
          aggregate_type: "workflow_instance",
          aggregate_id: String(document.id),
          event_type: "APPROVAL_WORKFLOW_COMPLETED",
        },
      }),
    ]);
    if (workflowCompletionCount !== 1 || approvalCompletionOutboxCount !== 1) {
      throw new Error(`Duplicate approval created side effects: completed=${workflowCompletionCount}, outbox=${approvalCompletionOutboxCount}`);
    }
    console.log("Concurrent duplicate approval rejected without duplicate completion");

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

    const signPayload = {
      signature_data: PNG_SIGNATURE,
      field_signatures: {
        [String(detailAfterSend.data.data.sign_request.fields[0].id)]: PNG_SIGNATURE,
      },
      signature_type: "drawn",
    };
    const signRequestConfig = { headers: { Authorization: `Bearer ${token}` } };
    const rollbackFunction = `e2e_block_sign_audit_${document.id}`;
    const rollbackTrigger = `e2e_block_sign_audit_trigger_${document.id}`;
    const signerBeforeRollback = await prisma.signers.findUnique({
      where: { id: internalSigner.id },
      select: { status: true, position_data: true },
    });
    const requestBeforeRollback = await prisma.sign_requests.findUnique({
      where: { id: signRequestId },
      select: { status: true },
    });
    await prisma.$executeRawUnsafe(`
      CREATE FUNCTION ${rollbackFunction}() RETURNS trigger AS $$
      BEGIN
        IF NEW.document_id = ${document.id} AND NEW.event = 'sign.internal_signed' THEN
          RAISE EXCEPTION 'e2e rollback verification';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER ${rollbackTrigger}
      BEFORE INSERT ON audit_logs FOR EACH ROW EXECUTE FUNCTION ${rollbackFunction}();
    `);
    try {
      let rollbackError;
      try {
        await axios.post(`${API_BASE}/sign-requests/${signRequestId}/sign-internal`, signPayload, signRequestConfig);
      } catch (error) {
        rollbackError = error;
      }
      if (!rollbackError || rollbackError.response?.status < 500) {
        throw new Error(`Expected forced signing transaction failure, got ${rollbackError?.response?.status || "success"}`);
      }
    } finally {
      await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS ${rollbackTrigger} ON audit_logs;`);
      await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS ${rollbackFunction}();`);
    }
    const [signerAfterRollback, requestAfterRollback, rollbackAuditCount, rollbackOutboxCount] = await Promise.all([
      prisma.signers.findUnique({ where: { id: internalSigner.id }, select: { status: true, position_data: true } }),
      prisma.sign_requests.findUnique({ where: { id: signRequestId }, select: { status: true } }),
      prisma.audit_logs.count({ where: { document_id: document.id, event: "sign.internal_signed" } }),
      prisma.outbox_events.count({
        where: { aggregate_type: "sign_request", aggregate_id: String(signRequestId), event_type: "SIGNATURE_SUBMITTED" },
      }),
    ]);
    if (
      signerAfterRollback?.status !== signerBeforeRollback?.status
      || JSON.stringify(signerAfterRollback?.position_data) !== JSON.stringify(signerBeforeRollback?.position_data)
      || requestAfterRollback?.status !== requestBeforeRollback?.status
      || rollbackAuditCount !== 0
      || rollbackOutboxCount !== 0
    ) {
      throw new Error("Failed signing transaction left committed state after its audit write failed");
    }
    console.log("Forced signing failure rolled back signer, request, audit, and outbox state");
    const [firstSign, duplicateSign] = await Promise.allSettled([
      axios.post(`${API_BASE}/sign-requests/${signRequestId}/sign-internal`, signPayload, signRequestConfig),
      axios.post(`${API_BASE}/sign-requests/${signRequestId}/sign-internal`, signPayload, signRequestConfig),
    ]);
    const successfulSigns = [firstSign, duplicateSign].filter((result) => result.status === "fulfilled");
    const rejectedSigns = [firstSign, duplicateSign].filter((result) => result.status === "rejected");
    if (successfulSigns.length !== 1 || rejectedSigns.length !== 1) {
      const outcomes = [firstSign, duplicateSign].map((result) => result.status === "fulfilled"
        ? `fulfilled:${result.value.status}`
        : `rejected:${result.reason.response?.status || result.reason.code || result.reason.message}`);
      throw new Error(`Expected exactly one successful signing request and one rejected duplicate; outcomes=${outcomes.join(",")}`);
    }
    const duplicateError = rejectedSigns[0].reason;
    if (duplicateError.response?.status !== 409) {
      throw new Error(`Expected duplicate signing request to return 409, got ${duplicateError.response?.status || duplicateError.message}`);
    }
    const [signatureAuditCount, signatureOutboxCount, artifactOutboxCount] = await Promise.all([
      prisma.audit_logs.count({
        where: { document_id: document.id, event: "sign.internal_signed" },
      }),
      prisma.outbox_events.count({
        where: {
          aggregate_type: "sign_request",
          aggregate_id: String(signRequestId),
          event_type: "SIGNATURE_SUBMITTED",
        },
      }),
      prisma.outbox_events.count({
        where: {
          aggregate_type: "sign_request",
          aggregate_id: String(signRequestId),
          event_type: "SIGNED_ARTIFACT_REQUESTED",
        },
      }),
    ]);
    if (signatureAuditCount !== 1 || signatureOutboxCount !== 1 || artifactOutboxCount !== 1) {
      throw new Error(`Duplicate signing created side effects: audits=${signatureAuditCount}, signature_outbox=${signatureOutboxCount}, artifact_outbox=${artifactOutboxCount}`);
    }
    console.log("Concurrent duplicate signing rejected without duplicate side effects");

    let finalState;
    for (let attempt = 1; attempt <= 20; attempt += 1) {
      const finalStateResponse = await axios.get(`${API_BASE}/sign-requests/${signRequestId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      finalState = finalStateResponse.data.data.sign_request;
      if (finalState.flow_state === "COMPLETED") break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (finalState?.flow_state !== "COMPLETED") {
      throw new Error(`Expected worker to reach COMPLETED, got ${finalState?.flow_state}`);
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

    const refreshLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    const refreshToken = refreshLogin.data.data.tokens.refreshToken;
    const rotatedRefresh = await axios.post(`${API_BASE}/auth/refresh`, { refresh_token: refreshToken });
    const rotatedRefreshToken = rotatedRefresh.data.data.tokens.refreshToken;
    const reusedRefresh = await axios.post(
      `${API_BASE}/auth/refresh`,
      { refresh_token: refreshToken },
      { validateStatus: () => true },
    );
    if (reusedRefresh.status !== 401 || reusedRefresh.data?.error?.code !== "INVALID_REFRESH_TOKEN") {
      throw new Error(`Rotated refresh token was reusable: ${reusedRefresh.status}`);
    }
    await axios.post(`${API_BASE}/auth/logout`, { refresh_token: rotatedRefreshToken });
    const revokedRefresh = await axios.post(
      `${API_BASE}/auth/refresh`,
      { refresh_token: rotatedRefreshToken },
      { validateStatus: () => true },
    );
    if (revokedRefresh.status !== 401 || revokedRefresh.data?.error?.code !== "INVALID_REFRESH_TOKEN") {
      throw new Error(`Logged-out refresh token was accepted: ${revokedRefresh.status}`);
    }
    const originalUserStatus = me.status || "active";
    const disabledSessionLogin = await axios.post(`${API_BASE}/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    const disabledRefreshToken = disabledSessionLogin.data.data.tokens.refreshToken;
    const disabledSessionId = JSON.parse(Buffer.from(disabledRefreshToken.split(".")[1], "base64url").toString("utf8")).jti;
    try {
      await prisma.users.update({ where: { id: userId }, data: { status: "disabled" } });
      const disabledRefresh = await axios.post(
        `${API_BASE}/auth/refresh`,
        { refresh_token: disabledRefreshToken },
        { validateStatus: () => true },
      );
      if (disabledRefresh.status !== 403 || disabledRefresh.data?.error?.code !== "ACCOUNT_NOT_ACTIVE") {
        throw new Error(`Disabled-user refresh was not rejected: ${disabledRefresh.status}`);
      }
      const disabledSession = await prisma.refresh_sessions.findUnique({
        where: { id: disabledSessionId },
        select: { revoked_at: true },
      });
      if (!disabledSession?.revoked_at) {
        throw new Error("Disabled-user refresh did not revoke its matching active session");
      }
    } finally {
      await prisma.users.update({ where: { id: userId }, data: { status: originalUserStatus } });
    }
    console.log("Refresh rotation, logout revocation, disabled-user rejection, and disabled-session revocation verified");

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
