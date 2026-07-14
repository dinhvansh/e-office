import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { prisma } from "../src/config/prisma";
import { documentPermissionResolverService } from "../src/modules/authorization/document-permission-resolver.service";
import { rolesService } from "../src/modules/roles/roles.service";
import { documentQueriesService } from "../src/modules/documents/documentQueries.service";
import { documentsRepository } from "../src/modules/documents/documents.repository";

const originalFindUser = prisma.users.findUnique;
const originalCheckPermission = rolesService.checkPermission;
const originalListForAccess = documentsRepository.listByTenantForAccess;
const originalResolveBatch = documentPermissionResolverService.resolveDocumentPermissionsBatch;

afterEach(() => {
  (prisma.users as unknown as { findUnique: unknown }).findUnique = originalFindUser;
  (rolesService as unknown as { checkPermission: unknown }).checkPermission = originalCheckPermission;
  (documentsRepository as unknown as { listByTenantForAccess: unknown }).listByTenantForAccess = originalListForAccess;
  (documentPermissionResolverService as unknown as { resolveDocumentPermissionsBatch: unknown }).resolveDocumentPermissionsBatch = originalResolveBatch;
});

const document = (id: number, tenantId = 1) => ({ id, tenant_id: tenantId, created_at: new Date(), document_type_id: null });

test("authorization is applied before pagination and explicit deny changes the accessible total", async () => {
  const candidates = [document(1), document(2), document(3), document(4), document(5)];
  (rolesService as unknown as { checkPermission: unknown }).checkPermission = async () => true;
  (documentsRepository as unknown as { listByTenantForAccess: unknown }).listByTenantForAccess = async (tenantId: number) => {
    assert.equal(tenantId, 1);
    return candidates;
  };
  (documentPermissionResolverService as unknown as { resolveDocumentPermissionsBatch: unknown }).resolveDocumentPermissionsBatch = async () => new Map([
    [1, { canView: true, reasons: ["owner"] }],
    [2, { canView: false, reasons: ["explicit deny"] }],
    [3, { canView: true, reasons: ["workflow participant"] }],
    [4, { canView: false, reasons: ["not allowed"] }],
    [5, { canView: true, reasons: ["ACL allow"] }],
  ]);

  const firstPage = await documentQueriesService.listDocumentsPaginated(1, 41, 1, 2);
  const secondPage = await documentQueriesService.listDocumentsPaginated(1, 41, 2, 2);
  assert.deepEqual(firstPage.data.map((item) => item.id), [1, 3]);
  assert.deepEqual(secondPage.data.map((item) => item.id), [5]);
  assert.deepEqual(firstPage.pagination, { page: 1, limit: 2, total: 3, totalPages: 2 });
});

test("non-paginated list uses the same batched tenant-scoped authorization path", async () => {
  const candidates = [document(10), document(11), document(12)];
  let resolvedTenantId: number | undefined;
  (prisma.users as unknown as { findUnique: unknown }).findUnique = async () => ({ tenant_id: 1 });
  (documentsRepository as unknown as { listByTenantForAccess: unknown }).listByTenantForAccess = async (tenantId: number) => {
    resolvedTenantId = tenantId;
    return candidates;
  };
  (documentPermissionResolverService as unknown as { resolveDocumentPermissionsBatch: unknown }).resolveDocumentPermissionsBatch = async (_userId: number, tenantId: number) => {
    assert.equal(tenantId, 1);
    return new Map([[10, { canView: true }], [11, { canView: false }], [12, { canView: true }]]);
  };

  const result = await documentQueriesService.listDocuments(1, 41);
  assert.equal(resolvedTenantId, 1);
  assert.deepEqual(result.map((item) => item.id), [10, 12]);
});

test("access candidate query always constrains the tenant before permission resolution", async () => {
  let whereClause: unknown;
  const database = {
    documents: {
      findMany: async ({ where }: { where: unknown }) => {
        whereClause = where;
        return [];
      },
    },
  };

  await documentsRepository.listByTenantForAccess(77, false, undefined, undefined, undefined, undefined, database as never);
  assert.deepEqual(whereClause, { tenant_id: 77 });
});

test("list authorization calls remain bounded for 10, 50, and 100 candidates", async () => {
  for (const count of [10, 50, 100]) {
    const candidates = Array.from({ length: count }, (_, index) => document(index + 1));
    let queryBoundaryCalls = 0;
    (rolesService as unknown as { checkPermission: unknown }).checkPermission = async () => { queryBoundaryCalls += 1; return true; };
    (documentsRepository as unknown as { listByTenantForAccess: unknown }).listByTenantForAccess = async () => { queryBoundaryCalls += 1; return candidates; };
    (documentPermissionResolverService as unknown as { resolveDocumentPermissionsBatch: unknown }).resolveDocumentPermissionsBatch = async () => {
      queryBoundaryCalls += 1;
      return new Map(candidates.map((item) => [item.id, { canView: true }]));
    };

    const result = await documentQueriesService.listDocumentsPaginated(1, 41, 1, 10);
    assert.equal(result.data.length, 10);
    assert.equal(result.pagination.total, count);
    assert.equal(queryBoundaryCalls, 3);
  }
});
