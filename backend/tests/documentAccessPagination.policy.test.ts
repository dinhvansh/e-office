import assert from "node:assert/strict";
import test from "node:test";
import { paginateAccessibleItems } from "../src/modules/documents/documentAccessPagination";

test("paginates only documents allowed by mixed access decisions and reports the accessible total", () => {
  const tenantDocuments = [101, 102, 103, 104, 105];
  const visibleDocuments = tenantDocuments.filter((id) => [101, 103, 105].includes(id));

  const firstPage = paginateAccessibleItems(visibleDocuments, 1, 2);
  const secondPage = paginateAccessibleItems(visibleDocuments, 2, 2);

  assert.deepEqual(firstPage.data, [101, 103]);
  assert.equal(firstPage.pagination.total, 3);
  assert.equal(firstPage.pagination.totalPages, 2);
  assert.deepEqual(secondPage.data, [105]);
});
