import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { prisma } from "../src/config/prisma";
import { approvalsService } from "../src/modules/approvals/approvals.service";
import { approvalsRepository } from "../src/modules/approvals/approvals.repository";

const originalApprovalFindMany = prisma.document_approvals.findMany;
const originalUserFindFirst = prisma.users.findFirst;
const originalRequestFindMany = prisma.sign_requests.findMany;
const originalWorkflowInstanceFindFirst = prisma.workflow_instances.findFirst;
const originalFindApprovalById = approvalsRepository.findApprovalById;

afterEach(() => {
  (prisma.document_approvals as unknown as { findMany: unknown }).findMany = originalApprovalFindMany;
  (prisma.users as unknown as { findFirst: unknown }).findFirst = originalUserFindFirst;
  (prisma.sign_requests as unknown as { findMany: unknown }).findMany = originalRequestFindMany;
  (prisma.workflow_instances as unknown as { findFirst: unknown }).findFirst = originalWorkflowInstanceFindFirst;
  (approvalsRepository as unknown as { findApprovalById: unknown }).findApprovalById = originalFindApprovalById;
});

const approval = {
  id: 51,
  document_id: 101,
  workflow_id: 11,
  workflow_step_id: 21,
  workflow_instance_id: 31,
  approver_user_id: 7,
  action: "pending",
  created_at: new Date("2026-07-14T00:00:00Z"),
  due_date: null,
  document: {
    id: 101,
    tenant_id: 2,
    status: "pending_approval",
    sign_request_id: null,
    document_number: "UX-101",
    title: "Assigned approval",
    document_type_id: 3,
    owner: { id: 4, email: "owner@example.test", full_name: "Owner" },
    document_type: { id: 3, name: "Memo", code: "MEMO" },
  },
  workflow: { id: 11, name: "Approval", approval_mode: "sequential" },
  workflow_step: { id: 21, step_name: "Review", step_order: 1 },
  approver: { id: 7, email: "approver@example.test", full_name: "Approver" },
};

const approvedApproval = {
  ...approval,
  id: 52,
  action: "approved",
  acted_at: new Date("2026-07-14T01:00:00Z"),
};

const visibleApprovalWhere = {
  approver_user_id: 7,
  document: { tenant_id: 2, status: { not: "archived" } },
  OR: [
    {
      action: "pending",
      workflow_instance: { status: "in_progress" },
      document: { status: "pending_approval" },
    },
    { action: { in: ["approved", "rejected", "request_info", "info_requested"] } },
  ],
};

test("approval list keeps terminal history while pending remains active-run scoped", async () => {
  const whereClauses: unknown[] = [];
  (prisma.document_approvals as unknown as { findMany: unknown }).findMany = async ({ where }: { where: unknown }) => {
    whereClauses.push(where);
    return [approval];
  };

  const result = await approvalsService.getMyPendingApprovals(7, 2);
  assert.equal(result.approvals.length, 1);
  assert.equal(result.statistics.pending, 1);
  assert.deepEqual(whereClauses[0], visibleApprovalWhere);
  assert.deepEqual(whereClauses[1], visibleApprovalWhere);
});

test("combined tasks keep completed approvals and scope pending approvals to the active run", async () => {
  let approvalWhere: unknown;
  (prisma.users as unknown as { findFirst: unknown }).findFirst = async () => ({ email: "approver@example.test" });
  (prisma.document_approvals as unknown as { findMany: unknown }).findMany = async ({ where }: { where: unknown }) => {
    approvalWhere = where;
    return [approval, approvedApproval];
  };
  (prisma.sign_requests as unknown as { findMany: unknown }).findMany = async ({ where }: { where: unknown }) => {
    assert.deepEqual(where, {
      tenant_id: 2,
      status: { not: "archived" },
      document: { status: { not: "archived" } },
    });
    return [];
  };

  const result = await approvalsService.getMyCombinedTasks(7, 2);
  assert.equal(result.tasks.length, 2);
  assert.equal(result.tasks[0].task_id, 51);
  assert.equal(result.tasks[1].task_id, 52);
  assert.equal(result.statistics.approval_pending, 1);
  assert.equal(result.statistics.completed, 1);
  assert.deepEqual(approvalWhere, visibleApprovalWhere);
});

test("combined tasks hide stale pending signers but keep completed signer history", async () => {
  (prisma.users as unknown as { findFirst: unknown }).findFirst = async () => ({ email: "approver@example.test" });
  (prisma.document_approvals as unknown as { findMany: unknown }).findMany = async () => [];
  (prisma.sign_requests as unknown as { findMany: unknown }).findMany = async () => [
    {
      id: 61,
      document_id: 101,
      status: "cancelled",
      created_at: new Date("2026-07-14T00:00:00Z"),
      document: approval.document,
      signers: [
        { id: 71, status: "pending", signing_order: 1 },
        { id: 72, status: "completed", signing_order: 1 },
      ],
    },
  ];

  const result = await approvalsService.getMyCombinedTasks(7, 2, { taskType: "signing" });

  assert.deepEqual(result.tasks.map((task) => task.task_id), [72]);
  assert.equal(result.statistics.signing_pending, 0);
  assert.equal(result.statistics.completed, 1);
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

test("an assigned approver cannot action a task from another tenant", async () => {
  (approvalsRepository as unknown as { findApprovalById: unknown }).findApprovalById = async () => approval;

  await assert.rejects(
    () => approvalsService.approve(approval.id, approval.approver_user_id, 999),
    (error: unknown) => {
      const apiError = error as { code?: string; statusCode?: number };
      return apiError.code === "ACCESS_DENIED" && apiError.statusCode === 403;
    },
  );
});

test("sequential approve and reject both deny a future step", async () => {
  (approvalsRepository as unknown as { findApprovalById: unknown }).findApprovalById = async () => approval;
  (prisma.workflow_instances as unknown as { findFirst: unknown }).findFirst = async () => ({ current_step_id: 999 });

  for (const action of [
    () => approvalsService.approve(approval.id, approval.approver_user_id, 2),
    () => approvalsService.reject(approval.id, approval.approver_user_id, 2),
  ]) {
    await assert.rejects(action, (error: unknown) => {
      const apiError = error as { code?: string; statusCode?: number };
      return apiError.code === "APPROVAL_RUN_NOT_ACTIVE" && apiError.statusCode === 409;
    });
  }
});

test("approval from a historical run is denied", async () => {
  (approvalsRepository as unknown as { findApprovalById: unknown }).findApprovalById = async () => approval;
  (prisma.workflow_instances as unknown as { findFirst: unknown }).findFirst = async () => null;

  await assert.rejects(
    () => approvalsService.approve(approval.id, approval.approver_user_id, 2),
    (error: unknown) => (error as { code?: string }).code === "APPROVAL_RUN_NOT_ACTIVE",
  );
});
