import assert from "node:assert/strict";
import test, { afterEach } from "node:test";

import { prisma } from "../src/config/prisma";
import { ApiError } from "../src/core/errors/api-error";
import { authorizationService } from "../src/modules/authorization/authorization.service";
import { documentsRepository } from "../src/modules/documents/documents.repository";
import { documentsService } from "../src/modules/documents/documents.service";

const originalFindDocument = documentsRepository.findById;
const originalCanAccess = authorizationService.canAccessDocument;
const originalFindApproval = prisma.document_approvals.findFirst;
const originalFindSigner = prisma.signers.findFirst;

afterEach(() => {
  (documentsRepository as unknown as { findById: unknown }).findById = originalFindDocument;
  (authorizationService as unknown as { canAccessDocument: unknown }).canAccessDocument = originalCanAccess;
  (prisma.document_approvals as unknown as { findFirst: unknown }).findFirst = originalFindApproval;
  (prisma.signers as unknown as { findFirst: unknown }).findFirst = originalFindSigner;
});

test("attachment upload is denied to a waiting or completed approver", async () => {
  (documentsRepository as unknown as { findById: unknown }).findById = async () => ({ id: 31, tenant_id: 4, owner_id: 1 });
  (authorizationService as unknown as { canAccessDocument: unknown }).canAccessDocument = async () => ({ allowed: true });
  let approvalWhere: unknown;
  (prisma.document_approvals as unknown as { findFirst: unknown }).findFirst = async ({ where }: { where: unknown }) => {
    approvalWhere = where;
    return null;
  };
  (prisma.signers as unknown as { findFirst: unknown }).findFirst = async () => null;

  await assert.rejects(
    () => documentsService.addAttachment(31, 4, 9, { file_name: "evidence.pdf", file_base64: "YQ==" }),
    (error: unknown) => error instanceof ApiError && error.code === "DOCUMENT_ATTACHMENT_DENIED" && error.statusCode === 403,
  );

  assert.deepEqual(approvalWhere, {
    document_id: 31,
    approver_user_id: 9,
    action: "pending",
    document: { tenant_id: 4 },
  });
});
