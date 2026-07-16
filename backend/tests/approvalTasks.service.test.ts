import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { prisma } from "../src/config/prisma";
import { approvalsService } from "../src/modules/approvals/approvals.service";
import { approvalsRepository } from "../src/modules/approvals/approvals.repository";

const originalApprovalFindMany = prisma.document_approvals.findMany;
const originalUserFindFirst = prisma.users.findFirst;
const originalRequestFindMany = prisma.sign_requests.findMany;
const originalFindApprovalById = approvalsRepository.findApprovalById;

afterEach(() => {
  (prisma.document_approvals as unknown as { findMany: unknown }).findMany = originalApprovalFindMany;
  (prisma.users as unknown as { findFirst: unknown }).findFirst = originalUserFindFirst;
  (prisma.sign_requests as unknown as { findMany: unknown }).findMany = originalRequestFindMany;
  (approvalsRepository as unknown as { findApprovalById: unknown }).findApprovalById = originalFindApprovalById;
});

const approval = {
  id: 51,
  document_id: 101,
  workflow_id: 11,
  workflow_step_id: 21,
  approver_user_id: 7,
  action: "pending",
  created_at: new Date("2026-07-14T00:00:00Z"),
  due_date: null,
  document: {
    id: 101,
    tenant_id: 2,
    document_number: "UX-101",
    title: "Assigned approval",
    document_type_id: 3,
    owner: { id: 4, email: "owner@example.test", full_name: "Owner" },
    document_type: { id: 3, name: "Memo", code: "MEMO" },
  },
  workflow: { id: 11, name: "Approval" },
  workflow_step: { id: 21, step_name: "Review", step_order: 1 },
  approver: { id: 7, email: "approver@example.test", full_name: "Approver" },
};

test("assigned approver sees only tenant-scoped pending approvals", async () => {
  const whereClauses: unknown[] = [];
  (prisma.document_approvals as unknown as { findMany: unknown }).findMany = async ({ where }: { where: unknown }) => {
    whereClauses.push(where);
    return [approval];
  };

  const result = await approvalsService.getMyPendingApprovals(7, 2);
  assert.equal(result.approvals.length, 1);
  assert.equal(result.statistics.pending, 1);
  assert.deepEqual(whereClauses[0], { approver_user_id: 7, document: { tenant_id: 2 } });
  assert.deepEqual(whereClauses[1], { approver_user_id: 7, document: { tenant_id: 2 } });
});

test("combined tasks scope pending approvals to the assigned user and tenant", async () => {
  let approvalWhere: unknown;
  (prisma.users as unknown as { findFirst: unknown }).findFirst = async () => ({ email: "approver@example.test" });
  (prisma.document_approvals as unknown as { findMany: unknown }).findMany = async ({ where }: { where: unknown }) => {
    approvalWhere = where;
    return [approval];
  };
  (prisma.sign_requests as unknown as { findMany: unknown }).findMany = async ({ where }: { where: unknown }) => {
    assert.deepEqual(where, { tenant_id: 2 });
    return [];
  };

  const result = await approvalsService.getMyCombinedTasks(7, 2);
  assert.equal(result.tasks.length, 1);
  assert.equal(result.tasks[0].task_id, 51);
  assert.deepEqual(approvalWhere, { approver_user_id: 7, document: { tenant_id: 2 } });
});

test("an unassigned user cannot approve a task even when RBAC allows approval updates", async () => {
  (approvalsRepository as unknown as { findApprovalById: unknown }).findApprovalById = async () => approval;

  await assert.rejects(
    () => approvalsService.approve(approval.id, 8, 2),
    (error: unknown) => {
      const apiError = error as { code?: string; statusCode?: number };
      return apiError.code === "NOT_APPROVER" && apiError.statusCode === 403;
    },
  );
});
