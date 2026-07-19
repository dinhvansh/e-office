import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import { prisma } from '../src/config/prisma';
import { approvalsRepository } from '../src/modules/approvals/approvals.repository';
import { approvalsService } from '../src/modules/approvals/approvals.service';
import { notificationsService } from '../src/modules/notifications/notifications.service';

const originals = {
  documentFindFirst: prisma.documents.findFirst,
  documentUpdate: prisma.documents.update,
  workflowFindFirst: prisma.workflows.findFirst,
  userFindUnique: prisma.users.findUnique,
  userFindMany: prisma.users.findMany,
  outboxCreate: prisma.outbox_events.create,
  transaction: prisma.$transaction,
  findWorkflowInstance: approvalsRepository.findWorkflowInstance,
  getApproversForStep: approvalsRepository.getApproversForStep,
  createWorkflowInstance: approvalsRepository.createWorkflowInstance,
  createApprovals: approvalsRepository.createApprovals,
  createNotification: notificationsService.createNotification,
};

afterEach(() => {
  (prisma.documents as unknown as { findFirst: unknown }).findFirst = originals.documentFindFirst;
  (prisma.documents as unknown as { update: unknown }).update = originals.documentUpdate;
  (prisma.workflows as unknown as { findFirst: unknown }).findFirst = originals.workflowFindFirst;
  (prisma.users as unknown as { findUnique: unknown }).findUnique = originals.userFindUnique;
  (prisma.users as unknown as { findMany: unknown }).findMany = originals.userFindMany;
  (prisma.outbox_events as unknown as { create: unknown }).create = originals.outboxCreate;
  (prisma as unknown as { $transaction: unknown }).$transaction = originals.transaction;
  (approvalsRepository as unknown as { findWorkflowInstance: unknown }).findWorkflowInstance = originals.findWorkflowInstance;
  (approvalsRepository as unknown as { getApproversForStep: unknown }).getApproversForStep = originals.getApproversForStep;
  (approvalsRepository as unknown as { createWorkflowInstance: unknown }).createWorkflowInstance = originals.createWorkflowInstance;
  (approvalsRepository as unknown as { createApprovals: unknown }).createApprovals = originals.createApprovals;
  (notificationsService as unknown as { createNotification: unknown }).createNotification = originals.createNotification;
});

async function submitWithMode(mode: 'sequential' | 'parallel') {
  const steps = [
    { id: 10, step_order: 1, step_name: 'First', due_in_days: 1, participant_role: 'approver', approver_type: 'user' },
    { id: 20, step_order: 2, step_name: 'Second', due_in_days: 2, participant_role: 'approver', approver_type: 'user' },
  ];
  let instanceInput: Record<string, unknown> | undefined;
  let approvalInputs: Array<Record<string, unknown>> = [];
  let notifiedUserIds: number[] = [];
  let queryRawCall = 0;

  (prisma.documents as unknown as { findFirst: unknown }).findFirst = async () => ({
    id: 100,
    tenant_id: 2,
    title: 'Runtime test',
    document_number: 'DOC-100',
  });
  (prisma.documents as unknown as { update: unknown }).update = async () => ({ id: 100 });
  (prisma.workflows as unknown as { findFirst: unknown }).findFirst = async () => ({
    id: 5,
    tenant_id: 2,
    name: 'Test workflow',
    approval_mode: mode,
    steps,
  });
  (prisma.users as unknown as { findUnique: unknown }).findUnique = async () => ({ full_name: 'Owner', email: 'owner@test' });
  (prisma.users as unknown as { findMany: unknown }).findMany = async () => [];
  (prisma.outbox_events as unknown as { create: unknown }).create = async () => ({ id: 1 });
  (prisma as unknown as { $transaction: unknown }).$transaction = async (
    callback: (tx: unknown) => Promise<unknown>,
  ) => callback({
    $queryRaw: async () => {
      queryRawCall += 1;
      return queryRawCall === 1
        ? [{ id: 100, status: 'draft', sign_request_id: null }]
        : [{ id: 101 }, { id: 202 }];
    },
    workflow_instances: { findFirst: async () => null },
    documents: { update: async () => ({ id: 100 }) },
    document_approvals: {
      findMany: async () => approvalInputs
        .filter((item) => item.action === 'pending')
        .map((item, index) => ({
          ...item,
          id: index + 1,
          approver: {
            id: item.approver_user_id,
            email: `u${item.approver_user_id}@test`,
            full_name: `User ${item.approver_user_id}`,
          },
          workflow_step: {
            step_name: item.workflow_step_id === 10 ? 'First' : 'Second',
            step_order: item.workflow_step_id === 10 ? 1 : 2,
          },
        })),
    },
    outbox_events: { create: async () => ({ id: 'outbox-1' }) },
    notifications: {
      create: async ({ data }: { data: { user_id: number } }) => {
        notifiedUserIds.push(data.user_id);
        return { id: notifiedUserIds.length, ...data };
      },
    },
  });
  (approvalsRepository as unknown as { findWorkflowInstance: unknown }).findWorkflowInstance = async () => null;
  (approvalsRepository as unknown as { getApproversForStep: unknown }).getApproversForStep = async (stepId: number) =>
    stepId === 10 ? [101] : [202];
  (approvalsRepository as unknown as { createWorkflowInstance: unknown }).createWorkflowInstance = async (input: Record<string, unknown>) => {
    instanceInput = input;
    return { id: 999, ...input };
  };
  (approvalsRepository as unknown as { createApprovals: unknown }).createApprovals = async (inputs: Array<Record<string, unknown>>) => {
    approvalInputs = inputs;
    return { count: inputs.length };
  };
  (notificationsService as unknown as { createNotification: unknown }).createNotification = async () => undefined;

  const result = await approvalsService.submitForApproval(100, 5, 2, 7);
  await new Promise((resolve) => setImmediate(resolve));
  return { result, instanceInput, approvalInputs, notifiedUserIds };
}

test('sequential submit creates one pending step, waiting future step, and current_step_id', async () => {
  const runtime = await submitWithMode('sequential');
  assert.equal(runtime.instanceInput?.current_step_id, 10);
  assert.deepEqual(runtime.approvalInputs.map((item) => item.action), ['pending', 'waiting']);
  assert.deepEqual(runtime.approvalInputs.map((item) => item.workflow_instance_id), [999, 999]);
  assert.deepEqual(runtime.notifiedUserIds, [101]);
});

test('parallel submit makes all approvals pending and notifies every approver', async () => {
  const runtime = await submitWithMode('parallel');
  assert.equal(runtime.instanceInput?.current_step_id, null);
  assert.deepEqual(runtime.approvalInputs.map((item) => item.action), ['pending', 'pending']);
  assert.deepEqual(runtime.approvalInputs.map((item) => item.workflow_instance_id), [999, 999]);
  assert.deepEqual(runtime.notifiedUserIds.sort(), [101, 202]);
  assert.equal(runtime.result.approvals, 2);
});
