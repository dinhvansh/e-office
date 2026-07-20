import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { ApiError } from "../src/core/errors/api-error";
import { prisma } from "../src/config/prisma";
import { documentTypesRepository } from "../src/modules/documentTypes/documentTypes.repository";
import { documentTypesService } from "../src/modules/documentTypes/documentTypes.service";
import { documentWorkflowOrchestratorService } from "../src/modules/documents/documentWorkflowOrchestrator.service";
import { signRequestsRepository } from "../src/modules/signRequests/signRequests.repository";

const originals = {
  findTypes: documentTypesRepository.findByTenant,
  userFindUnique: prisma.users.findUnique,
  settingsFindMany: prisma.tenant_settings.findMany,
  transaction: prisma.$transaction,
  resolveWorkflowSnapshot: (documentWorkflowOrchestratorService as any).resolveWorkflowSnapshot,
  seedWorkflowSigners: (documentWorkflowOrchestratorService as any).seedWorkflowSigners,
  seedManualSigners: (documentWorkflowOrchestratorService as any).seedManualSigners,
  signRequestFindById: signRequestsRepository.findById,
  documentTypeFindFirst: prisma.document_types.findFirst,
  workflowFindFirst: prisma.workflows.findFirst,
  usersFindMany: prisma.users.findMany,
};

function replace(target: object, key: string, value: unknown) {
  (target as Record<string, unknown>)[key] = value;
}

afterEach(() => {
  replace(documentTypesRepository, "findByTenant", originals.findTypes);
  replace(prisma.users, "findUnique", originals.userFindUnique);
  replace(prisma.tenant_settings, "findMany", originals.settingsFindMany);
  replace(prisma, "$transaction", originals.transaction);
  replace(documentWorkflowOrchestratorService, "resolveWorkflowSnapshot", originals.resolveWorkflowSnapshot);
  replace(documentWorkflowOrchestratorService, "seedWorkflowSigners", originals.seedWorkflowSigners);
  replace(documentWorkflowOrchestratorService, "seedManualSigners", originals.seedManualSigners);
  replace(signRequestsRepository, "findById", originals.signRequestFindById);
  replace(prisma.document_types, "findFirst", originals.documentTypeFindFirst);
  replace(prisma.workflows, "findFirst", originals.workflowFindFirst);
  replace(prisma.users, "findMany", originals.usersFindMany);
});

test("sign-request document-type lookup returns only active approval/signing capabilities", async () => {
  replace(documentTypesRepository, "findByTenant", async () => [
    { id: 1, is_active: true, require_approval: true, require_digital_signing: false },
    { id: 2, is_active: true, require_approval: false, require_digital_signing: true },
    { id: 3, is_active: true, require_approval: true, require_digital_signing: true },
    { id: 4, is_active: true, require_approval: false, require_digital_signing: false },
    { id: 5, is_active: false, require_approval: true, require_digital_signing: true },
  ]);
  replace(prisma.users, "findUnique", async () => ({ id: 9, tenant_id: 7, user_roles: [] }));
  replace(prisma.tenant_settings, "findMany", async () => []);

  const result = await documentTypesService.getDocumentTypes(7, undefined, 9, "sign_request");
  assert.deepEqual(result.map((item) => item.id), [1, 2, 3]);
});

function installDraftTransaction(signerCount: number) {
  const tx = {
    sign_requests: { create: async () => ({ id: 101 }) },
    documents: { update: async () => ({}) },
    signers: { count: async () => signerCount },
  };
  replace(prisma, "$transaction", async (operation: unknown) =>
    (operation as (client: typeof tx) => Promise<unknown>)(tx)
  );
  replace(documentWorkflowOrchestratorService, "seedWorkflowSigners", async () => 0);
  replace(documentWorkflowOrchestratorService, "seedManualSigners", async () => undefined);
}

async function expectDomainCode(operation: Promise<unknown>, code: string) {
  await assert.rejects(operation, (error: unknown) => error instanceof ApiError && error.code === code);
}

test("approval-only draft requires an approver step but does not require a signer", async () => {
  installDraftTransaction(0);
  replace(documentWorkflowOrchestratorService, "resolveWorkflowSnapshot", async () => ({
    id: 50,
    steps: [{ participant_role: "approver" }],
  }));

  await documentWorkflowOrchestratorService.prepareDraftPackage({
    documentId: 20,
    tenantId: 7,
    ownerId: 9,
    documentFileName: "approval.pdf",
    documentType: { require_approval: true, require_digital_signing: false },
  });
});

test("approval capability rejects a workflow without an approver step", async () => {
  installDraftTransaction(1);
  replace(documentWorkflowOrchestratorService, "resolveWorkflowSnapshot", async () => ({
    id: 50,
    steps: [{ participant_role: "signer" }],
  }));

  await expectDomainCode(documentWorkflowOrchestratorService.prepareDraftPackage({
    documentId: 20,
    tenantId: 7,
    ownerId: 9,
    documentFileName: "approval.pdf",
    documentType: { require_approval: true, require_digital_signing: false },
  }), "APPROVAL_STEP_REQUIRED");
});

test("digital-signing capability accepts an internal or external signer and rejects none", async () => {
  installDraftTransaction(0);
  replace(documentWorkflowOrchestratorService, "resolveWorkflowSnapshot", async () => null);
  await expectDomainCode(documentWorkflowOrchestratorService.prepareDraftPackage({
    documentId: 21,
    tenantId: 7,
    ownerId: 9,
    documentFileName: "sign.pdf",
    documentType: { require_approval: false, require_digital_signing: true },
  }), "SIGNER_REQUIRED");

  installDraftTransaction(1);
  await documentWorkflowOrchestratorService.prepareDraftPackage({
    documentId: 21,
    tenantId: 7,
    ownerId: 9,
    documentFileName: "sign.pdf",
    documentType: { require_approval: false, require_digital_signing: true },
  });
});

test("combined capability requires both an approver step and a signer", async () => {
  installDraftTransaction(1);
  replace(documentWorkflowOrchestratorService, "resolveWorkflowSnapshot", async () => ({
    id: 50,
    steps: [{ participant_role: "approver" }, { participant_role: "signer" }],
  }));

  await documentWorkflowOrchestratorService.prepareDraftPackage({
    documentId: 22,
    tenantId: 7,
    ownerId: 9,
    documentFileName: "combined.pdf",
    documentType: { require_approval: true, require_digital_signing: true },
  });
});

test("send validation accepts external or active internal signers but rejects inactive internal users", async () => {
  const baseRequest = {
    id: 101,
    document_id: 22,
    document: { document_type_id: 3 },
  };
  replace(prisma.document_types, "findFirst", async () => ({ require_approval: false, require_digital_signing: true }));
  replace(prisma.workflows, "findFirst", async () => null);

  replace(signRequestsRepository, "findById", async () => ({
    ...baseRequest,
    signers: [{ role: "signer", is_internal: false, user_id: null, email: "outside@example.test", name: "Outside Signer" }],
  }));
  await documentWorkflowOrchestratorService.validateDraftRequirements(101, 7);

  replace(signRequestsRepository, "findById", async () => ({
    ...baseRequest,
    signers: [{ role: "signer", is_internal: true, user_id: 44, email: "inside@example.test", name: "Inside Signer" }],
  }));
  replace(prisma.users, "findMany", async () => []);
  await expectDomainCode(
    documentWorkflowOrchestratorService.validateDraftRequirements(101, 7),
    "SIGNER_REQUIRED",
  );

  replace(prisma.users, "findMany", async () => [{ id: 44 }]);
  await documentWorkflowOrchestratorService.validateDraftRequirements(101, 7);
});
