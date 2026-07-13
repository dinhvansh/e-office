import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { documentsService } from "../src/modules/documents/documents.service";
import { documentsRepository } from "../src/modules/documents/documents.repository";
import { documentWorkflowOrchestratorService } from "../src/modules/documents/documentWorkflowOrchestrator.service";
import { permissionsService } from "../src/modules/documents/permissions.service";
import { licenseService } from "../src/modules/licenses/license.service";
import { storageService } from "../src/core/storage/storage.service";
import { prisma } from "../src/config/prisma";

const originals = {
  create: documentsRepository.create,
  prepareDraftPackage: documentWorkflowOrchestratorService.prepareDraftPackage,
  grantPermission: permissionsService.grantPermission,
  enforceDocumentLimit: licenseService.enforceDocumentLimit,
  storageGet: storageService.get,
  deleteDocument: documentsService.deleteDocument,
  ccCreate: prisma.document_cc_emails.create,
  userFindUnique: prisma.users.findUnique,
  transaction: prisma.$transaction,
};

function replace(target: object, key: string, value: unknown) {
  (target as Record<string, unknown>)[key] = value;
}

afterEach(() => {
  replace(documentsRepository, "create", originals.create);
  replace(documentWorkflowOrchestratorService, "prepareDraftPackage", originals.prepareDraftPackage);
  replace(permissionsService, "grantPermission", originals.grantPermission);
  replace(licenseService, "enforceDocumentLimit", originals.enforceDocumentLimit);
  replace(storageService, "get", originals.storageGet);
  replace(documentsService, "deleteDocument", originals.deleteDocument);
  replace(prisma.document_cc_emails, "create", originals.ccCreate);
  replace(prisma.users, "findUnique", originals.userFindUnique);
  replace(prisma, "$transaction", originals.transaction);
});

function installDocumentCreation(documentId = 30) {
  replace(licenseService, "enforceDocumentLimit", async () => undefined);
  replace(storageService, "get", async () => Buffer.from("source"));
  replace(documentsRepository, "create", async () => ({
    id: documentId,
    title: "Synthetic document",
    original_file_name: "source.pdf",
  }));
}

async function expectCompensatedFailure(input: Parameters<typeof documentsService.createDocument>[0]) {
  const deleted: number[] = [];
  replace(documentsService, "deleteDocument", async (documentId: number) => { deleted.push(documentId); });
  await assert.rejects(documentsService.createDocument(input, 1, 2));
  assert.deepEqual(deleted, [30]);
}

test("workflow package creation failure compensates the document record", async () => {
  installDocumentCreation();
  replace(documentWorkflowOrchestratorService, "prepareDraftPackage", async () => { throw new Error("workflow failure"); });

  await expectCompensatedFailure({ fileName: "source.pdf", storagePath: "storage/source.pdf", forceSignRequest: true });
});

test("ACL persistence failure compensates the document record", async () => {
  installDocumentCreation();
  replace(permissionsService, "grantPermission", async () => { throw new Error("ACL failure"); });

  await expectCompensatedFailure({
    fileName: "source.pdf",
    storagePath: "storage/source.pdf",
    detailPermissions: [{ subject_type: "user", subject_id: 3 }],
  });
});

test("CC persistence failure after workflow preparation compensates the document package", async () => {
  installDocumentCreation();
  replace(documentWorkflowOrchestratorService, "prepareDraftPackage", async () => undefined);
  replace(prisma.users, "findUnique", async () => ({ full_name: "Owner", email: "owner@example.test" }));
  replace(prisma.document_cc_emails, "create", async () => { throw new Error("CC failure"); });

  await expectCompensatedFailure({
    fileName: "source.pdf",
    storagePath: "storage/source.pdf",
    forceSignRequest: true,
    ccEmails: ["cc@example.test"],
  });
});

test("signer creation failure rolls back the draft package transaction", async () => {
  const persisted: string[] = [];
  const tx = {
    sign_requests: { create: async () => { persisted.push("sign-request"); return { id: 20 }; } },
    documents: { update: async () => { persisted.push("document-link"); } },
    users: { findMany: async () => [] },
    signers: {
      findMany: async () => [],
      create: async () => { throw new Error("signer failure"); },
    },
  };
  replace(prisma, "$transaction", async (operation: unknown) => {
    try {
      return await (operation as (client: typeof tx) => Promise<unknown>)(tx);
    } catch (error) {
      persisted.splice(0);
      throw error;
    }
  });

  await assert.rejects(documentWorkflowOrchestratorService.prepareDraftPackage({
    documentId: 30,
    tenantId: 1,
    ownerId: 2,
    documentFileName: "source.pdf",
    signers: [{ email: "signer@example.test", name: "Signer", order: 1, type: "external" }],
  }));
  assert.deepEqual(persisted, []);
});
