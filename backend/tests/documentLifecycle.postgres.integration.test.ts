import assert from "node:assert/strict";
import test from "node:test";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "../src/config/prisma";
import { ApiError } from "../src/core/errors/api-error";
import { requirePermission } from "../src/middleware/permission";
import { approvalsService } from "../src/modules/approvals/approvals.service";
import { archiveService } from "../src/modules/archive/archive.service";
import { documentLifecycleService } from "../src/modules/documents/documentLifecycle.service";
import { documentsService } from "../src/modules/documents/documents.service";
import { PERMISSION_CATALOG } from "../src/modules/roles/permission-catalog";
import { rolesService } from "../src/modules/roles/roles.service";
import { signRequestsService } from "../src/modules/signRequests/signRequests.service";
import { tenantBootstrapService } from "../src/modules/tenants/tenant-bootstrap.service";
import { workflowCancellationService } from "../src/modules/workflows/workflowCancellation.service";

const enabled = process.env.RUN_POSTGRES_INTEGRATION === "1";

function unique(label: string): string {
  return `lifecycle-${label}-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function resetTestData(): Promise<void> {
  // This suite only runs against an explicitly enabled, isolated PostgreSQL database.
  // Truncating the tenant root with CASCADE removes every scenario-owned record while
  // retaining the global permission catalog and Prisma migration history.
  await prisma.$executeRawUnsafe('TRUNCATE TABLE "tenants" RESTART IDENTITY CASCADE');
}

async function seedPermissionCatalog(): Promise<void> {
  for (const permission of PERMISSION_CATALOG) {
    await prisma.permissions.upsert({
      where: { resource_action: { resource: permission.resource, action: permission.action } },
      create: permission,
      update: { description: permission.description },
    });
  }
}

async function createTenantFixture(label: string) {
  const prefix = unique(label);
  const tenant = await prisma.tenants.create({
    data: { name: prefix, domain: `${prefix}.test`, status: "active" },
  });
  const admin = await prisma.users.create({
    data: {
      tenant_id: tenant.id,
      email: `${prefix}-admin@example.test`,
      password_hash: "integration-test-only",
      full_name: "Lifecycle Admin",
      status: "active",
    },
  });
  await tenantBootstrapService.bootstrapTenant(tenant.id, admin.id);
  const approver = await prisma.users.create({
    data: {
      tenant_id: tenant.id,
      email: `${prefix}-approver@example.test`,
      password_hash: "integration-test-only",
      full_name: "Lifecycle Approver",
      status: "active",
    },
  });
  const workflow = await prisma.workflows.create({
    data: {
      tenant_id: tenant.id,
      name: `${prefix}-workflow`,
      created_by: admin.id,
      steps: {
        create: {
          step_order: 1,
          step_name: "Approval",
          approver_type: "user",
          approver_id: approver.id,
          assignee_type: "specific_user",
          assignee_user_id: approver.id,
          participant_role: "approver",
        },
      },
    },
    include: { steps: true },
  });
  return { prefix, tenant, admin, approver, workflow, step: workflow.steps[0] };
}

type Fixture = Awaited<ReturnType<typeof createTenantFixture>>;

async function createDocument(fixture: Fixture, status: string, label = status) {
  return prisma.documents.create({
    data: {
      tenant_id: fixture.tenant.id,
      owner_id: fixture.admin.id,
      file_path: `${fixture.prefix}-${label}.pdf`,
      original_file_name: `${label}.pdf`,
      title: `${label} document`,
      document_number: `${fixture.prefix}-${label}`,
      status,
    },
  });
}

async function createLinkedRequest(fixture: Fixture, documentId: number, status: string, label = status) {
  const request = await prisma.sign_requests.create({
    data: {
      tenant_id: fixture.tenant.id,
      document_id: documentId,
      title: `${label} sign request`,
      status,
    },
  });
  await prisma.documents.update({ where: { id: documentId }, data: { sign_request_id: request.id } });
  return request;
}

async function createRunWithApproval(
  fixture: Fixture,
  documentId: number,
  runNumber: number,
  runStatus: string,
  action: string,
) {
  const run = await prisma.workflow_instances.create({
    data: {
      document_id: documentId,
      workflow_id: fixture.workflow.id,
      run_number: runNumber,
      status: runStatus,
      current_step_id: runStatus === "in_progress" ? fixture.step.id : null,
      completed_at: runStatus === "in_progress" ? null : new Date(),
    },
  });
  const approval = await prisma.document_approvals.create({
    data: {
      document_id: documentId,
      workflow_id: fixture.workflow.id,
      workflow_step_id: fixture.step.id,
      workflow_instance_id: run.id,
      approver_user_id: fixture.approver.id,
      action,
      acted_at: action === "pending" ? null : new Date(),
      comment: action === "pending" ? null : `${action} history`,
    },
  });
  return { run, approval };
}

async function expectApiError(operation: Promise<unknown>, codes?: string[]): Promise<ApiError> {
  let captured: unknown;
  try {
    await operation;
  } catch (error) {
    captured = error;
  }
  assert.ok(captured instanceof ApiError, `Expected ApiError, received ${String(captured)}`);
  if (codes) assert.ok(codes.includes(captured.code), `Unexpected error code: ${captured.code}`);
  return captured;
}

async function invokePermissionMiddleware(userId: number, resource: string, action: string) {
  let statusCode = 200;
  let nextCalled = false;
  const request = { auth: { userId } } as Request;
  const response = {
    status(code: number) {
      statusCode = code;
      return this;
    },
    json() {
      return this;
    },
  } as unknown as Response;
  const next = (() => {
    nextCalled = true;
  }) as NextFunction;
  await requirePermission(resource, action)(request, response, next);
  return { statusCode, nextCalled };
}

test("Delete, Cancel and Archive lifecycle PostgreSQL integration", { skip: !enabled }, async (suite) => {
  await prisma.$queryRaw`SELECT 1`;
  await resetTestData();
  await seedPermissionCatalog();

  await suite.test("clean draft is hard deleted with its linked draft request and no orphans", async () => {
    try {
      const fixture = await createTenantFixture("draft-delete");
      const document = await createDocument(fixture, "draft");
      const request = await createLinkedRequest(fixture, document.id, "draft");
      const signer = await prisma.signers.create({
        data: { sign_request_id: request.id, email: `${fixture.prefix}-signer@example.test`, status: "draft" },
      });
      const field = await prisma.sign_request_fields.create({
        data: { sign_request_id: request.id, document_id: document.id, assigned_signer_id: signer.id, type: "signature", page: 1, x: 10, y: 10 },
      });

      await documentsService.deleteDocument(document.id, fixture.tenant.id, fixture.admin.id);

      assert.equal(await prisma.documents.count({ where: { id: document.id } }), 0);
      assert.equal(await prisma.sign_requests.count({ where: { id: request.id } }), 0);
      assert.equal(await prisma.signers.count({ where: { id: signer.id } }), 0);
      assert.equal(await prisma.sign_request_fields.count({ where: { id: field.id } }), 0);
      assert.equal(await prisma.documents.count({ where: { id: document.id, status: "archived" } }), 0);
    } finally {
      await resetTestData();
    }
  });

  await suite.test("draft with lifecycle history is denied without deleting history", async () => {
    try {
      const fixture = await createTenantFixture("draft-history");
      const document = await createDocument(fixture, "draft");
      const historical = await createRunWithApproval(fixture, document.id, 1, "cancelled", "approved");
      const audit = await prisma.audit_logs.create({
        data: { document_id: document.id, event: "sign.submitted_for_approval", user_id: fixture.admin.id },
      });

      await expectApiError(
        documentsService.deleteDocument(document.id, fixture.tenant.id, fixture.admin.id),
        ["DOCUMENT_DRAFT_HAS_LIFECYCLE_HISTORY"],
      );

      assert.equal((await prisma.documents.findUniqueOrThrow({ where: { id: document.id } })).status, "draft");
      assert.equal((await prisma.workflow_instances.findUniqueOrThrow({ where: { id: historical.run.id } })).status, "cancelled");
      assert.equal((await prisma.document_approvals.findUniqueOrThrow({ where: { id: historical.approval.id } })).action, "approved");
      assert.equal(await prisma.audit_logs.count({ where: { id: audit.id } }), 1);
    } finally {
      await resetTestData();
    }
  });

  await suite.test("rejected document archives and preserves workflow, approval, signer, audit and artifact data", async () => {
    try {
      const fixture = await createTenantFixture("rejected-archive");
      const document = await prisma.documents.create({
        data: {
          tenant_id: fixture.tenant.id,
          owner_id: fixture.admin.id,
          file_path: `${fixture.prefix}-source.pdf`,
          signed_file_path: `${fixture.prefix}-final.pdf`,
          hash: "sha256-retained",
          artifact_metadata: { version: 3, storageKey: `${fixture.prefix}-artifact` },
          original_file_name: "rejected.pdf",
          status: "rejected",
        },
      });
      const request = await createLinkedRequest(fixture, document.id, "rejected");
      const signer = await prisma.signers.create({
        data: {
          sign_request_id: request.id,
          email: `${fixture.prefix}-signed@example.test`,
          status: "signed",
          signed_at: new Date(),
          signature_data: "retained-signature",
        },
      });
      const historical = await createRunWithApproval(fixture, document.id, 1, "rejected", "rejected");
      const existingAudit = await prisma.audit_logs.create({
        data: { document_id: document.id, event: "approval.rejected", user_id: fixture.approver.id },
      });

      await documentsService.deleteDocument(document.id, fixture.tenant.id, fixture.admin.id);

      const archived = await prisma.documents.findUniqueOrThrow({ where: { id: document.id } });
      const archivedRequest = await prisma.sign_requests.findUniqueOrThrow({ where: { id: request.id } });
      assert.equal(archived.status, "archived");
      assert.ok(archived.archived_at);
      assert.equal(archived.archived_by, fixture.admin.id);
      assert.equal(archived.previous_status, "rejected");
      assert.equal(archivedRequest.status, "archived");
      assert.equal(archivedRequest.previous_status, "rejected");
      assert.equal(archived.signed_file_path, `${fixture.prefix}-final.pdf`);
      assert.equal(archived.file_path, `${fixture.prefix}-source.pdf`);
      assert.equal(archived.hash, "sha256-retained");
      assert.deepEqual(archived.artifact_metadata, { version: 3, storageKey: `${fixture.prefix}-artifact` });
      assert.equal((await prisma.workflow_instances.findUniqueOrThrow({ where: { id: historical.run.id } })).status, "rejected");
      assert.equal((await prisma.document_approvals.findUniqueOrThrow({ where: { id: historical.approval.id } })).action, "rejected");
      assert.equal((await prisma.signers.findUniqueOrThrow({ where: { id: signer.id } })).signature_data, "retained-signature");
      assert.equal(await prisma.audit_logs.count({ where: { id: existingAudit.id } }), 1);
      assert.equal(await prisma.audit_logs.count({ where: { document_id: document.id, event: "DOCUMENT_ARCHIVED" } }), 1);
    } finally {
      await resetTestData();
    }
  });

  await suite.test("unified cancel then archive and restore keeps old runtime non-actionable", async () => {
    try {
      const fixture = await createTenantFixture("cancel-archive-restore");
      const document = await createDocument(fixture, "in_progress");
      const request = await createLinkedRequest(fixture, document.id, "in_progress");
      const signer = await prisma.signers.create({
        data: {
          sign_request_id: request.id,
          email: `${fixture.prefix}-otp@example.test`,
          status: "otp_sent",
          otp: "123456",
          otp_expire: new Date(Date.now() + 60_000),
          signing_token: `${fixture.prefix}-token`,
        },
      });
      const historical = await createRunWithApproval(fixture, document.id, 1, "completed", "approved");
      const active = await createRunWithApproval(fixture, document.id, 2, "in_progress", "pending");

      await workflowCancellationService.cancel({
        documentId: document.id,
        tenantId: fixture.tenant.id,
        userId: fixture.admin.id,
        reason: "Archive requested",
      });

      assert.equal((await prisma.documents.findUniqueOrThrow({ where: { id: document.id } })).status, "cancelled");
      assert.equal((await prisma.sign_requests.findUniqueOrThrow({ where: { id: request.id } })).status, "cancelled");
      assert.equal((await prisma.workflow_instances.findUniqueOrThrow({ where: { id: active.run.id } })).status, "cancelled");
      assert.equal((await prisma.workflow_instances.findUniqueOrThrow({ where: { id: historical.run.id } })).status, "completed");
      assert.deepEqual(
        await prisma.signers.findUnique({ where: { id: signer.id }, select: { status: true, otp: true, otp_expire: true, signing_token: true } }),
        { status: "cancelled", otp: null, otp_expire: null, signing_token: null },
      );
      await expectApiError(
        approvalsService.approve(active.approval.id, fixture.approver.id, fixture.tenant.id),
      );

      await documentsService.deleteDocument(document.id, fixture.tenant.id, fixture.admin.id);
      assert.equal((await prisma.documents.findUniqueOrThrow({ where: { id: document.id } })).status, "archived");
      assert.equal((await prisma.sign_requests.findUniqueOrThrow({ where: { id: request.id } })).status, "archived");
      assert.equal(await prisma.workflow_instances.count({ where: { document_id: document.id, status: "in_progress" } }), 0);
      assert.deepEqual(
        await prisma.signers.findUnique({ where: { id: signer.id }, select: { status: true, otp: true, otp_expire: true, signing_token: true } }),
        { status: "cancelled", otp: null, otp_expire: null, signing_token: null },
      );
      assert.equal(await prisma.audit_logs.count({ where: { document_id: document.id, event: "document.cancelled" } }), 1);
      assert.equal(await prisma.audit_logs.count({ where: { document_id: document.id, event: "DOCUMENT_ARCHIVED" } }), 1);

      await archiveService.restore(fixture.tenant.id, document.id, fixture.admin.id);
      assert.equal((await prisma.documents.findUniqueOrThrow({ where: { id: document.id } })).status, "cancelled");
      assert.equal((await prisma.sign_requests.findUniqueOrThrow({ where: { id: request.id } })).status, "cancelled");
      assert.equal((await prisma.workflow_instances.findUniqueOrThrow({ where: { id: active.run.id } })).status, "cancelled");
      assert.equal((await prisma.workflow_instances.findUniqueOrThrow({ where: { id: historical.run.id } })).status, "completed");
      assert.equal((await prisma.document_approvals.findUniqueOrThrow({ where: { id: active.approval.id } })).action, "pending");
      assert.equal((await prisma.document_approvals.findUniqueOrThrow({ where: { id: historical.approval.id } })).action, "approved");
      assert.deepEqual(
        await prisma.signers.findUnique({ where: { id: signer.id }, select: { status: true, otp: true, otp_expire: true, signing_token: true } }),
        { status: "cancelled", otp: null, otp_expire: null, signing_token: null },
      );
      await expectApiError(
        approvalsService.approve(active.approval.id, fixture.approver.id, fixture.tenant.id),
      );
      assert.equal(await prisma.audit_logs.count({ where: { document_id: document.id, event: "DOCUMENT_RESTORED" } }), 1);
    } finally {
      await resetTestData();
    }
  });

  await suite.test("active states cannot be archived directly and have no incidental mutations", async () => {
    try {
      const fixture = await createTenantFixture("active-denied");
      for (const status of ["pending_approval", "pending_signature", "in_progress", "signing", "generating_artifact"]) {
        const document = await createDocument(fixture, status, `active-${status}`);
        const request = await createLinkedRequest(fixture, document.id, status, `active-${status}`);
        const signer = await prisma.signers.create({
          data: {
            sign_request_id: request.id,
            email: `${fixture.prefix}-${status}@example.test`,
            status: "otp_sent",
            otp: "654321",
            otp_expire: new Date(Date.now() + 60_000),
            signing_token: `${fixture.prefix}-${status}-token`,
          },
        });
        const active = await createRunWithApproval(fixture, document.id, 1, "in_progress", "pending");

        await expectApiError(
          documentsService.deleteDocument(document.id, fixture.tenant.id, fixture.admin.id),
          ["DOCUMENT_DELETE_DENIED", "DOCUMENT_DELETE_DENIED_STATUS"],
        );
        await expectApiError(
          documentLifecycleService.archive(document, fixture.admin.id),
          ["DOCUMENT_ARCHIVE_DENIED_STATUS"],
        );

        assert.equal((await prisma.documents.findUniqueOrThrow({ where: { id: document.id } })).status, status);
        assert.equal((await prisma.sign_requests.findUniqueOrThrow({ where: { id: request.id } })).status, status);
        assert.equal((await prisma.workflow_instances.findUniqueOrThrow({ where: { id: active.run.id } })).status, "in_progress");
        assert.deepEqual(
          await prisma.signers.findUnique({ where: { id: signer.id }, select: { status: true, otp: true, signing_token: true } }),
          { status: "otp_sent", otp: "654321", signing_token: `${fixture.prefix}-${status}-token` },
        );
      }
    } finally {
      await resetTestData();
    }
  });

  await suite.test("completed document and sign-request delete/archive mutations are denied with all final data retained", async () => {
    try {
      const fixture = await createTenantFixture("completed-denied");
      const document = await prisma.documents.create({
        data: {
          tenant_id: fixture.tenant.id,
          owner_id: fixture.admin.id,
          file_path: `${fixture.prefix}-source.pdf`,
          signed_file_path: `${fixture.prefix}-final.pdf`,
          hash: "completed-sha256",
          artifact_metadata: { final: true, storageKey: `${fixture.prefix}-final` },
          original_file_name: "completed.pdf",
          status: "completed",
        },
      });
      const request = await createLinkedRequest(fixture, document.id, "completed");
      const signer = await prisma.signers.create({
        data: { sign_request_id: request.id, email: `${fixture.prefix}-done@example.test`, status: "signed", signed_at: new Date(), signature_data: "final-signature" },
      });
      const completed = await createRunWithApproval(fixture, document.id, 1, "completed", "approved");
      const audit = await prisma.audit_logs.create({ data: { document_id: document.id, event: "document.completed", user_id: fixture.admin.id } });

      await expectApiError(
        documentsService.deleteDocument(document.id, fixture.tenant.id, fixture.admin.id),
        ["DOCUMENT_DELETE_DENIED", "DOCUMENT_DELETE_DENIED_STATUS"],
      );
      await expectApiError(documentLifecycleService.archive(document, fixture.admin.id), ["DOCUMENT_ARCHIVE_DENIED_STATUS"]);
      await expectApiError(signRequestsService.deleteSignRequest(request.id, fixture.tenant.id, fixture.admin.id));

      const retained = await prisma.documents.findUniqueOrThrow({ where: { id: document.id } });
      assert.equal(retained.status, "completed");
      assert.equal(retained.signed_file_path, `${fixture.prefix}-final.pdf`);
      assert.equal(retained.file_path, `${fixture.prefix}-source.pdf`);
      assert.equal(retained.hash, "completed-sha256");
      assert.deepEqual(retained.artifact_metadata, { final: true, storageKey: `${fixture.prefix}-final` });
      assert.equal((await prisma.sign_requests.findUniqueOrThrow({ where: { id: request.id } })).status, "completed");
      assert.equal((await prisma.signers.findUniqueOrThrow({ where: { id: signer.id } })).signature_data, "final-signature");
      assert.equal((await prisma.workflow_instances.findUniqueOrThrow({ where: { id: completed.run.id } })).status, "completed");
      assert.equal((await prisma.document_approvals.findUniqueOrThrow({ where: { id: completed.approval.id } })).action, "approved");
      assert.equal(await prisma.audit_logs.count({ where: { id: audit.id } }), 1);
      assert.equal(await prisma.audit_logs.count({ where: { document_id: document.id, event: "DOCUMENT_ARCHIVED" } }), 0);
    } finally {
      await resetTestData();
    }
  });

  await suite.test("archive permissions and tenant scope deny unauthorized and cross-tenant access", async () => {
    try {
      const tenantA = await createTenantFixture("tenant-a");
      const tenantB = await createTenantFixture("tenant-b");
      const noPermissionUser = await prisma.users.create({
        data: {
          tenant_id: tenantA.tenant.id,
          email: `${tenantA.prefix}-plain@example.test`,
          password_hash: "integration-test-only",
          full_name: "Plain User",
          status: "active",
        },
      });
      const delegatedUser = await prisma.users.create({
        data: {
          tenant_id: tenantA.tenant.id,
          email: `${tenantA.prefix}-archive-viewer@example.test`,
          password_hash: "integration-test-only",
          full_name: "Archive Viewer",
          status: "active",
        },
      });
      const archiveView = await prisma.permissions.findUniqueOrThrow({
        where: { resource_action: { resource: "archive", action: "view" } },
      });
      const viewerRole = await prisma.roles.create({
        data: {
          tenant_id: tenantA.tenant.id,
          name: "Archive Viewer",
          role_permissions: { create: { permission_id: archiveView.id } },
          user_roles: { create: { user_id: delegatedUser.id } },
        },
      });
      assert.ok(viewerRole.id);

      const foreignDocument = await createDocument(tenantB, "cancelled", "foreign-archive");
      await documentsService.deleteDocument(foreignDocument.id, tenantB.tenant.id, tenantB.admin.id);

      assert.equal(await rolesService.checkPermission(tenantA.admin.id, "archive", "view"), true);
      assert.equal(await rolesService.checkPermission(tenantA.admin.id, "archive", "restore"), true);
      assert.equal(await rolesService.checkPermission(noPermissionUser.id, "archive", "view"), false);
      assert.equal(await rolesService.checkPermission(delegatedUser.id, "archive", "view"), true);
      assert.deepEqual(await invokePermissionMiddleware(tenantA.admin.id, "archive", "view"), { statusCode: 200, nextCalled: true });
      assert.deepEqual(await invokePermissionMiddleware(delegatedUser.id, "archive", "view"), { statusCode: 200, nextCalled: true });
      assert.deepEqual(await invokePermissionMiddleware(noPermissionUser.id, "archive", "view"), { statusCode: 403, nextCalled: false });
      await expectApiError(
        documentsService.deleteDocument(foreignDocument.id, tenantA.tenant.id, tenantA.admin.id),
        ["DOCUMENT_NOT_FOUND"],
      );
      assert.equal((await archiveService.list(tenantA.tenant.id)).some((item) => item.id === foreignDocument.id), false);
      await expectApiError(archiveService.get(tenantA.tenant.id, foreignDocument.id), ["ARCHIVE_NOT_FOUND"]);
      await expectApiError(
        archiveService.restore(tenantA.tenant.id, foreignDocument.id, tenantA.admin.id),
        ["ARCHIVE_NOT_FOUND"],
      );
      assert.equal((await prisma.documents.findUniqueOrThrow({ where: { id: foreignDocument.id } })).status, "archived");
    } finally {
      await resetTestData();
    }
  });

  await resetTestData();
});
