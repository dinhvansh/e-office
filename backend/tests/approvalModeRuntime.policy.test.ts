import assert from 'node:assert/strict';
import test from 'node:test';
import {
  initialApprovalAction,
  initialCurrentStepId,
  isApprovalActionableInRun,
  isParallelApprovalComplete,
} from '../src/modules/approvals/approvalModeRuntime.policy';

const actionable = (overrides: Partial<Parameters<typeof isApprovalActionableInRun>[0]> = {}) =>
  isApprovalActionableInRun({
    mode: 'sequential',
    approvalAction: 'pending',
    workflowRunStatus: 'in_progress',
    currentStepId: 10,
    approvalStepId: 10,
    documentStatus: 'pending_approval',
    ...overrides,
  });

test('sequential runtime creates step 1 pending and future steps waiting', () => {
  assert.equal(initialApprovalAction('sequential', 0), 'pending');
  assert.equal(initialApprovalAction('sequential', 1), 'waiting');
  assert.equal(initialApprovalAction('sequential', 2), 'waiting');
  assert.equal(initialCurrentStepId('sequential', 10), 10);
});

test('sequential future step cannot approve or reject before current step completes', () => {
  assert.equal(actionable({ approvalStepId: 20 }), false);
  // Approve and reject share this authorization gate before either mutation.
  assert.equal(actionable({ approvalStepId: 20 }), false);
});

test('sequential transition makes the next step actionable and moves current_step_id', () => {
  assert.equal(actionable({ currentStepId: 20, approvalStepId: 20 }), true);
  assert.equal(actionable({ currentStepId: 20, approvalStepId: 10 }), false);
});

test('only a pending approval is actionable', () => {
  assert.equal(actionable({ approvalAction: 'approved' }), false);
  assert.equal(actionable({ approvalAction: 'waiting' }), false);
  assert.equal(actionable({ approvalAction: 'rejected' }), false);
});

test('historical workflow runs cannot action approvals', () => {
  assert.equal(actionable({ workflowRunStatus: 'completed' }), false);
  assert.equal(actionable({ workflowRunStatus: 'cancelled' }), false);
  assert.equal(actionable({ workflowRunStatus: 'rejected' }), false);
});

test('cancelled, archived, rejected, and completed documents are not actionable', () => {
  for (const documentStatus of ['cancelled', 'archived', 'rejected', 'completed']) {
    assert.equal(actionable({ documentStatus }), false);
  }
});

test('parallel runtime activates all approvers and has no current step pointer', () => {
  assert.equal(initialApprovalAction('parallel', 0), 'pending');
  assert.equal(initialApprovalAction('parallel', 1), 'pending');
  assert.equal(initialApprovalAction('parallel', 2), 'pending');
  assert.equal(initialCurrentStepId('parallel', 10), null);
});

test('parallel approvals remain independently actionable without current_step_id gating', () => {
  assert.equal(actionable({ mode: 'parallel', currentStepId: null, approvalStepId: 10 }), true);
  assert.equal(actionable({ mode: 'parallel', currentStepId: null, approvalStepId: 20 }), true);
});

test('parallel ALL APPROVE remains incomplete while any approval is pending', () => {
  assert.equal(isParallelApprovalComplete(['approved', 'pending']), false);
  assert.equal(isParallelApprovalComplete(['pending', 'pending']), false);
});

test('parallel ALL APPROVE completes only after every approval is approved', () => {
  assert.equal(isParallelApprovalComplete(['approved', 'approved']), true);
  assert.equal(isParallelApprovalComplete([]), false);
});

test('parallel reject is not treated as completion and existing reject path remains terminal', () => {
  assert.equal(isParallelApprovalComplete(['approved', 'rejected']), false);
  assert.equal(actionable({ mode: 'parallel', approvalAction: 'rejected', currentStepId: null }), false);
});

test('parallel historical run approval is denied', () => {
  assert.equal(actionable({ mode: 'parallel', workflowRunStatus: 'completed', currentStepId: null }), false);
});

test('default sequential mode retains the legacy ordered behavior', () => {
  assert.equal(initialApprovalAction('sequential', 0), 'pending');
  assert.equal(initialApprovalAction('sequential', 1), 'waiting');
  assert.equal(actionable(), true);
});
