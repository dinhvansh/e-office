import assert from 'node:assert/strict';
import test from 'node:test';
import { prisma } from '../src/config/prisma';
import { approvalsService } from '../src/modules/approvals/approvals.service';

const postgresEnabled = process.env.RUN_POSTGRES_INTEGRATION === '1';

type Fixture = Awaited<ReturnType<typeof createFixture>>;

function uniquePrefix(label: string): string {
  return `approval-it-${label}-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function delay(milliseconds: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function createFixture(mode: 'sequential' | 'parallel', approverCount: number, label: string) {
  const prefix = uniquePrefix(label);
  const tenant = await prisma.tenants.create({
    data: { name: prefix, domain: `${prefix}.test`, status: 'active' },
  });
  const owner = await prisma.users.create({
    data: {
      tenant_id: tenant.id,
      email: `${prefix}-owner@example.test`,
      password_hash: 'integration-test-only',
      full_name: 'Integration Owner',
      status: 'active',
    },
  });
  const approvers = [];
  for (let index = 0; index < approverCount; index += 1) {
    approvers.push(await prisma.users.create({
      data: {
        tenant_id: tenant.id,
        email: `${prefix}-approver-${index + 1}@example.test`,
        password_hash: 'integration-test-only',
        full_name: `Approver ${index + 1}`,
        status: 'active',
      },
    }));
  }
  const workflow = await prisma.workflows.create({
    data: {
      tenant_id: tenant.id,
      name: `${prefix}-workflow`,
      approval_mode: mode,
      is_active: true,
      created_by: owner.id,
      steps: {
        create: approvers.map((approver, index) => ({
          step_order: index + 1,
          step_name: `Step ${index + 1}`,
          approver_type: 'user',
          approver_id: approver.id,
          assignee_type: 'specific_user',
          assignee_user_id: approver.id,
          completion_mode: 'all',
          participant_role: 'approver',
          due_in_days: 3,
        })),
      },
    },
    include: { steps: { orderBy: { step_order: 'asc' } } },
  });
  const document = await prisma.documents.create({
    data: {
      tenant_id: tenant.id,
      owner_id: owner.id,
      file_path: `${prefix}.pdf`,
      original_file_name: `${prefix}.pdf`,
      title: `${prefix} document`,
      document_number: prefix,
      status: 'draft',
    },
  });
  return { prefix, tenant, owner, approvers, workflow, document };
}

async function settleNotifications(): Promise<void> {
  // submit/approve deliberately dispatch notifications without awaiting them.
  await delay(150);
}

async function cleanupFixture(fixture: Fixture): Promise<void> {
  await settleNotifications();
  const documentIds = await prisma.documents.findMany({
    where: { tenant_id: fixture.tenant.id },
    select: { id: true },
  }).then((items) => items.map((item) => item.id));
  await prisma.notifications.deleteMany({ where: { tenant_id: fixture.tenant.id } });
  await prisma.outbox_events.deleteMany({
    where: {
      OR: [
        { tenant_id: fixture.tenant.id },
        { aggregate_id: { contains: fixture.prefix } },
      ],
    },
  });
  await prisma.audit_logs.deleteMany({ where: { document_id: { in: documentIds } } });
  await prisma.document_approvals.deleteMany({ where: { document_id: { in: documentIds } } });
  await prisma.workflow_instances.deleteMany({ where: { document_id: { in: documentIds } } });
  const signRequestIds = await prisma.sign_requests.findMany({
    where: { tenant_id: fixture.tenant.id },
    select: { id: true },
  }).then((items) => items.map((item) => item.id));
  await prisma.signers.deleteMany({ where: { sign_request_id: { in: signRequestIds } } });
  await prisma.sign_request_comments.deleteMany({ where: { sign_request_id: { in: signRequestIds } } });
  await prisma.documents.updateMany({
    where: { tenant_id: fixture.tenant.id },
    data: { sign_request_id: null },
  });
  await prisma.sign_requests.deleteMany({ where: { id: { in: signRequestIds } } });
  await prisma.documents.deleteMany({ where: { tenant_id: fixture.tenant.id } });
  await prisma.workflows.deleteMany({ where: { tenant_id: fixture.tenant.id } });
  await prisma.users.deleteMany({ where: { tenant_id: fixture.tenant.id } });
  await prisma.tenants.delete({ where: { id: fixture.tenant.id } });
}

async function submit(fixture: Fixture) {
  await approvalsService.submitForApproval(
    fixture.document.id,
    fixture.workflow.id,
    fixture.tenant.id,
    fixture.owner.id,
  );
  await settleNotifications();
  const run = await prisma.workflow_instances.findFirstOrThrow({
    where: { document_id: fixture.document.id, status: 'in_progress' },
  });
  const approvals = await prisma.document_approvals.findMany({
    where: { workflow_instance_id: run.id },
    include: { workflow_step: true },
    orderBy: { workflow_step: { step_order: 'asc' } },
  });
  return { run, approvals };
}

async function installApprovalFailureTrigger(documentId: number, approverUserId: number): Promise<() => Promise<void>> {
  const functionName = `fail_approval_insert_${documentId}`;
  const triggerName = `fail_approval_trigger_${documentId}`;
  await prisma.$executeRawUnsafe(`
    CREATE FUNCTION "${functionName}"() RETURNS trigger AS $$
    BEGIN
      IF NEW.document_id = ${documentId} AND NEW.approver_user_id = ${approverUserId} THEN
        RAISE EXCEPTION 'injected approval creation failure';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER "${triggerName}"
    BEFORE INSERT ON "document_approvals"
    FOR EACH ROW EXECUTE FUNCTION "${functionName}"();
  `);
  return async () => {
    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS "${triggerName}" ON "document_approvals";`);
    await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${functionName}"();`);
  };
}

async function installNotificationFailureTrigger(tenantId: number): Promise<() => Promise<void>> {
  const functionName = `fail_notification_insert_${tenantId}`;
  const triggerName = `fail_notification_trigger_${tenantId}`;
  await prisma.$executeRawUnsafe(`
    CREATE FUNCTION "${functionName}"() RETURNS trigger AS $$
    BEGIN
      IF NEW.tenant_id = ${tenantId} THEN
        RAISE EXCEPTION 'injected notification creation failure after outbox insert';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER "${triggerName}"
    BEFORE INSERT ON "notifications"
    FOR EACH ROW EXECUTE FUNCTION "${functionName}"();
  `);
  return async () => {
    await prisma.$executeRawUnsafe(`DROP TRIGGER IF EXISTS "${triggerName}" ON "notifications";`);
    await prisma.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${functionName}"();`);
  };
}

async function countApprovalRequestOutbox(approvalIds: number[]): Promise<number> {
  return prisma.outbox_events.count({
    where: {
      event_type: 'EMAIL_DELIVERY_REQUESTED',
      aggregate_type: 'document_approval',
      aggregate_id: { in: approvalIds.map(String) },
    },
  });
}

test('Approval Mode PostgreSQL integration', { skip: !postgresEnabled }, async (suite) => {
  await prisma.$queryRaw`SELECT 1`;

  await suite.test('sequential runtime, future-step denial, and ordered transitions', async () => {
    const fixture = await createFixture('sequential', 3, 'sequential');
    try {
      const initial = await submit(fixture);
      assert.equal(await prisma.workflow_instances.count({
        where: { document_id: fixture.document.id, status: 'in_progress' },
      }), 1);
      assert.equal(initial.run.current_step_id, fixture.workflow.steps[0].id);
      assert.deepEqual(initial.approvals.map((approval) => approval.action), ['pending', 'waiting', 'waiting']);
      assert.deepEqual(new Set(initial.approvals.map((approval) => approval.workflow_instance_id)), new Set([initial.run.id]));
      assert.equal(await countApprovalRequestOutbox(initial.approvals.map((approval) => approval.id)), 1);
      assert.equal(await prisma.notifications.count({ where: { tenant_id: fixture.tenant.id } }), 1);

      await assert.rejects(
        () => approvalsService.approve(initial.approvals[1].id, fixture.approvers[1].id, fixture.tenant.id),
      );
      await assert.rejects(
        () => approvalsService.reject(initial.approvals[1].id, fixture.approvers[1].id, fixture.tenant.id),
      );
      let unchangedRun = await prisma.workflow_instances.findUniqueOrThrow({ where: { id: initial.run.id } });
      let unchangedStepTwo = await prisma.document_approvals.findUniqueOrThrow({ where: { id: initial.approvals[1].id } });
      assert.equal(unchangedRun.current_step_id, fixture.workflow.steps[0].id);
      assert.equal(unchangedStepTwo.action, 'waiting');

      await approvalsService.approve(initial.approvals[0].id, fixture.approvers[0].id, fixture.tenant.id);
      let actions = await prisma.document_approvals.findMany({
        where: { workflow_instance_id: initial.run.id },
        orderBy: { workflow_step: { step_order: 'asc' } },
      });
      unchangedRun = await prisma.workflow_instances.findUniqueOrThrow({ where: { id: initial.run.id } });
      assert.deepEqual(actions.map((approval) => approval.action), ['approved', 'pending', 'waiting']);
      assert.equal(unchangedRun.current_step_id, fixture.workflow.steps[1].id);
      assert.equal(await countApprovalRequestOutbox(initial.approvals.map((approval) => approval.id)), 2);
      assert.equal(await prisma.notifications.count({ where: { tenant_id: fixture.tenant.id } }), 2);
      assert.equal(await prisma.outbox_events.count({
        where: { deduplication_key: `approval-request:${initial.run.id}:${initial.approvals[1].id}` },
      }), 1);

      await approvalsService.approve(initial.approvals[1].id, fixture.approvers[1].id, fixture.tenant.id);
      actions = await prisma.document_approvals.findMany({
        where: { workflow_instance_id: initial.run.id },
        orderBy: { workflow_step: { step_order: 'asc' } },
      });
      const transitionedRun = await prisma.workflow_instances.findUniqueOrThrow({ where: { id: initial.run.id } });
      assert.deepEqual(actions.map((approval) => approval.action), ['approved', 'approved', 'pending']);
      assert.equal(transitionedRun.current_step_id, fixture.workflow.steps[2].id);
      assert.equal(await countApprovalRequestOutbox(initial.approvals.map((approval) => approval.id)), 3);
    } finally {
      await cleanupFixture(fixture);
    }
  });

  await suite.test('parallel runtime follows ALL APPROVE through final lifecycle', async () => {
    const fixture = await createFixture('parallel', 3, 'parallel-all');
    try {
      const initial = await submit(fixture);
      assert.equal(initial.run.current_step_id, null);
      assert.equal(initial.run.status, 'in_progress');
      assert.deepEqual(initial.approvals.map((approval) => approval.action), ['pending', 'pending', 'pending']);
      assert.deepEqual(new Set(initial.approvals.map((approval) => approval.workflow_instance_id)), new Set([initial.run.id]));
      assert.equal(await countApprovalRequestOutbox(initial.approvals.map((approval) => approval.id)), 3);
      assert.equal(await prisma.notifications.count({ where: { tenant_id: fixture.tenant.id } }), 3);

      await approvalsService.approve(initial.approvals[0].id, fixture.approvers[0].id, fixture.tenant.id);
      let run = await prisma.workflow_instances.findUniqueOrThrow({ where: { id: initial.run.id } });
      let actions = await prisma.document_approvals.findMany({ where: { workflow_instance_id: initial.run.id } });
      assert.equal(run.status, 'in_progress');
      assert.deepEqual(actions.map((item) => item.action).sort(), ['approved', 'pending', 'pending']);

      await approvalsService.approve(initial.approvals[1].id, fixture.approvers[1].id, fixture.tenant.id);
      run = await prisma.workflow_instances.findUniqueOrThrow({ where: { id: initial.run.id } });
      actions = await prisma.document_approvals.findMany({ where: { workflow_instance_id: initial.run.id } });
      assert.equal(run.status, 'in_progress');
      assert.deepEqual(actions.map((item) => item.action).sort(), ['approved', 'approved', 'pending']);

      await approvalsService.approve(initial.approvals[2].id, fixture.approvers[2].id, fixture.tenant.id);
      run = await prisma.workflow_instances.findUniqueOrThrow({ where: { id: initial.run.id } });
      actions = await prisma.document_approvals.findMany({ where: { workflow_instance_id: initial.run.id } });
      const document = await prisma.documents.findUniqueOrThrow({ where: { id: fixture.document.id } });
      assert.equal(run.status, 'completed');
      assert.ok(actions.every((item) => item.action === 'approved'));
      assert.equal(document.status, 'completed');
    } finally {
      await cleanupFixture(fixture);
    }
  });

  await suite.test('parallel concurrent approvals complete once without lost approvals', async () => {
    const fixture = await createFixture('parallel', 2, 'parallel-concurrent');
    try {
      const initial = await submit(fixture);
      const results = await Promise.allSettled([
        approvalsService.approve(initial.approvals[0].id, fixture.approvers[0].id, fixture.tenant.id),
        approvalsService.approve(initial.approvals[1].id, fixture.approvers[1].id, fixture.tenant.id),
      ]);
      assert.deepEqual(results.map((result) => result.status), ['fulfilled', 'fulfilled']);
      const run = await prisma.workflow_instances.findUniqueOrThrow({ where: { id: initial.run.id } });
      const actions = await prisma.document_approvals.findMany({ where: { workflow_instance_id: initial.run.id } });
      const completionEvents = await prisma.outbox_events.count({
        where: {
          event_type: 'APPROVAL_WORKFLOW_COMPLETED',
          aggregate_type: 'workflow_instance',
          payload: { path: ['workflow_instance_id'], equals: initial.run.id },
        },
      });
      assert.equal(run.status, 'completed');
      assert.ok(actions.every((item) => item.action === 'approved'));
      assert.equal(completionEvents, 1);
    } finally {
      await cleanupFixture(fixture);
    }
  });

  await suite.test('parallel approve/reject race ends consistently as rejected', async () => {
    const fixture = await createFixture('parallel', 2, 'parallel-reject');
    try {
      const initial = await submit(fixture);
      const results = await Promise.allSettled([
        approvalsService.approve(initial.approvals[0].id, fixture.approvers[0].id, fixture.tenant.id),
        approvalsService.reject(initial.approvals[1].id, fixture.approvers[1].id, fixture.tenant.id, 'Rejected in race test'),
      ]);
      assert.ok(results.some((result) => result.status === 'fulfilled'));
      const run = await prisma.workflow_instances.findUniqueOrThrow({ where: { id: initial.run.id } });
      const document = await prisma.documents.findUniqueOrThrow({ where: { id: fixture.document.id } });
      const approvals = await prisma.document_approvals.findMany({ where: { workflow_instance_id: initial.run.id } });
      const completionEvents = await prisma.outbox_events.count({
        where: { event_type: 'APPROVAL_WORKFLOW_COMPLETED', tenant_id: fixture.tenant.id },
      });
      assert.equal(run.status, 'rejected');
      assert.equal(document.status, 'rejected');
      assert.equal(completionEvents, 0);
      assert.equal(approvals.length, 2);
      assert.ok(approvals.some((approval) => approval.action === 'rejected'));
    } finally {
      await cleanupFixture(fixture);
    }
  });

  await suite.test('historical run is immutable and only active run can transition', async () => {
    const fixture = await createFixture('parallel', 1, 'multi-run');
    try {
      const step = fixture.workflow.steps[0];
      const runOne = await prisma.workflow_instances.create({
        data: {
          document_id: fixture.document.id,
          workflow_id: fixture.workflow.id,
          current_step_id: null,
          status: 'cancelled',
          run_number: 1,
          completed_at: new Date(),
        },
      });
      const runOneApproval = await prisma.document_approvals.create({
        data: {
          document_id: fixture.document.id,
          workflow_id: fixture.workflow.id,
          workflow_step_id: step.id,
          workflow_instance_id: runOne.id,
          approver_user_id: fixture.approvers[0].id,
          action: 'pending',
        },
      });
      await prisma.documents.update({ where: { id: fixture.document.id }, data: { status: 'pending_approval' } });
      const runTwo = await prisma.workflow_instances.create({
        data: {
          document_id: fixture.document.id,
          workflow_id: fixture.workflow.id,
          current_step_id: null,
          status: 'in_progress',
          run_number: 2,
        },
      });
      const runTwoApproval = await prisma.document_approvals.create({
        data: {
          document_id: fixture.document.id,
          workflow_id: fixture.workflow.id,
          workflow_step_id: step.id,
          workflow_instance_id: runTwo.id,
          approver_user_id: fixture.approvers[0].id,
          action: 'pending',
        },
      });

      const actionableTasks = await approvalsService.getMyPendingApprovals(
        fixture.approvers[0].id,
        fixture.tenant.id,
        { page: 1, limit: 10 },
      );
      assert.equal(actionableTasks.pagination.total, 1);
      assert.equal(actionableTasks.approvals[0].workflow_instance_id, runTwo.id);

      await assert.rejects(
        () => approvalsService.approve(runOneApproval.id, fixture.approvers[0].id, fixture.tenant.id),
      );
      await approvalsService.approve(runTwoApproval.id, fixture.approvers[0].id, fixture.tenant.id);
      const historicalRun = await prisma.workflow_instances.findUniqueOrThrow({ where: { id: runOne.id } });
      const historicalApproval = await prisma.document_approvals.findUniqueOrThrow({ where: { id: runOneApproval.id } });
      const activeRun = await prisma.workflow_instances.findUniqueOrThrow({ where: { id: runTwo.id } });
      assert.equal(historicalRun.status, 'cancelled');
      assert.equal(historicalApproval.action, 'pending');
      assert.equal(activeRun.status, 'completed');
    } finally {
      await cleanupFixture(fixture);
    }
  });

  await suite.test('My Tasks reflects sequential activation and parallel assignments from PostgreSQL', async () => {
    const sequentialFixture = await createFixture('sequential', 2, 'tasks-sequential');
    const parallelFixture = await createFixture('parallel', 2, 'tasks-parallel');
    try {
      const sequential = await submit(sequentialFixture);
      let futureTasks = await approvalsService.getMyPendingApprovals(
        sequentialFixture.approvers[1].id,
        sequentialFixture.tenant.id,
        { page: 1, limit: 1 },
      );
      assert.equal(futureTasks.pagination.total, 0);
      await approvalsService.approve(sequential.approvals[0].id, sequentialFixture.approvers[0].id, sequentialFixture.tenant.id);
      futureTasks = await approvalsService.getMyPendingApprovals(
        sequentialFixture.approvers[1].id,
        sequentialFixture.tenant.id,
        { page: 1, limit: 1 },
      );
      assert.equal(futureTasks.pagination.total, 1);
      assert.equal(futureTasks.approvals.length, 1);

      await submit(parallelFixture);
      for (const approver of parallelFixture.approvers) {
        const tasks = await approvalsService.getMyPendingApprovals(
          approver.id,
          parallelFixture.tenant.id,
          { page: 1, limit: 1 },
        );
        assert.equal(tasks.pagination.total, 1);
        assert.equal(tasks.approvals.length, 1);
      }
    } finally {
      await cleanupFixture(sequentialFixture);
      await cleanupFixture(parallelFixture);
    }
  });

  await suite.test('linked document, sign request, and draft signer commit with the runtime', async () => {
    const fixture = await createFixture('sequential', 1, 'linked-lifecycle');
    try {
      const signRequest = await prisma.sign_requests.create({
        data: {
          tenant_id: fixture.tenant.id,
          document_id: fixture.document.id,
          title: 'Linked lifecycle request',
          status: 'draft',
        },
      });
      await prisma.documents.update({
        where: { id: fixture.document.id },
        data: { sign_request_id: signRequest.id },
      });
      const signer = await prisma.signers.create({
        data: {
          sign_request_id: signRequest.id,
          user_id: fixture.approvers[0].id,
          email: fixture.approvers[0].email,
          is_internal: true,
          status: 'draft',
        },
      });

      const runtime = await submit(fixture);
      assert.equal(runtime.approvals.length, 1);
      assert.equal((await prisma.documents.findUniqueOrThrow({ where: { id: fixture.document.id } })).status, 'pending_approval');
      assert.equal((await prisma.sign_requests.findUniqueOrThrow({ where: { id: signRequest.id } })).status, 'pending_approval');
      assert.equal((await prisma.signers.findUniqueOrThrow({ where: { id: signer.id } })).status, 'waiting_approval');
    } finally {
      await cleanupFixture(fixture);
    }
  });

  await suite.test('failure after transactional outbox insert rolls back runtime and outbox together', async () => {
    const fixture = await createFixture('parallel', 2, 'atomic-outbox');
    const removeTrigger = await installNotificationFailureTrigger(fixture.tenant.id);
    try {
      await assert.rejects(() => approvalsService.submitForApproval(
        fixture.document.id,
        fixture.workflow.id,
        fixture.tenant.id,
        fixture.owner.id,
      ));
      assert.equal(await prisma.workflow_instances.count({ where: { document_id: fixture.document.id } }), 0);
      assert.equal(await prisma.document_approvals.count({ where: { document_id: fixture.document.id } }), 0);
      assert.equal(await prisma.outbox_events.count({ where: { tenant_id: fixture.tenant.id } }), 0);
      assert.equal(await prisma.notifications.count({ where: { tenant_id: fixture.tenant.id } }), 0);
      assert.equal((await prisma.documents.findUniqueOrThrow({ where: { id: fixture.document.id } })).status, 'draft');
    } finally {
      await removeTrigger();
      await cleanupFixture(fixture);
    }
  });

  await suite.test('sequential runtime rolls back instance, approvals, and lifecycle on approval insert failure', async () => {
    const fixture = await createFixture('sequential', 2, 'atomic-sequential');
    const removeTrigger = await installApprovalFailureTrigger(fixture.document.id, fixture.approvers[0].id);
    try {
      await assert.rejects(() => approvalsService.submitForApproval(
        fixture.document.id,
        fixture.workflow.id,
        fixture.tenant.id,
        fixture.owner.id,
      ));
      assert.equal(await prisma.workflow_instances.count({ where: { document_id: fixture.document.id } }), 0);
      assert.equal(await prisma.document_approvals.count({ where: { document_id: fixture.document.id } }), 0);
      assert.equal(await prisma.notifications.count({ where: { tenant_id: fixture.tenant.id } }), 0);
      assert.equal(await prisma.outbox_events.count({ where: { tenant_id: fixture.tenant.id } }), 0);
      assert.equal((await prisma.documents.findUniqueOrThrow({ where: { id: fixture.document.id } })).status, 'draft');
    } finally {
      await removeTrigger();
      await cleanupFixture(fixture);
    }
  });

  await suite.test('parallel approval materialization cannot commit a partial set', async () => {
    const fixture = await createFixture('parallel', 3, 'atomic-parallel');
    const removeTrigger = await installApprovalFailureTrigger(fixture.document.id, fixture.approvers[2].id);
    try {
      const signRequest = await prisma.sign_requests.create({
        data: {
          tenant_id: fixture.tenant.id,
          document_id: fixture.document.id,
          title: 'Atomic parallel request',
          status: 'draft',
        },
      });
      await prisma.documents.update({
        where: { id: fixture.document.id },
        data: { sign_request_id: signRequest.id },
      });
      const signer = await prisma.signers.create({
        data: {
          sign_request_id: signRequest.id,
          user_id: fixture.approvers[0].id,
          email: fixture.approvers[0].email,
          is_internal: true,
          status: 'draft',
        },
      });
      await assert.rejects(() => approvalsService.submitForApproval(
        fixture.document.id,
        fixture.workflow.id,
        fixture.tenant.id,
        fixture.owner.id,
      ));
      assert.equal(await prisma.workflow_instances.count({ where: { document_id: fixture.document.id } }), 0);
      assert.equal(await prisma.document_approvals.count({ where: { document_id: fixture.document.id } }), 0);
      assert.equal(await prisma.notifications.count({ where: { tenant_id: fixture.tenant.id } }), 0);
      assert.equal(await prisma.outbox_events.count({ where: { tenant_id: fixture.tenant.id } }), 0);
      assert.equal((await prisma.documents.findUniqueOrThrow({ where: { id: fixture.document.id } })).status, 'draft');
      assert.equal((await prisma.sign_requests.findUniqueOrThrow({ where: { id: signRequest.id } })).status, 'draft');
      assert.equal((await prisma.signers.findUniqueOrThrow({ where: { id: signer.id } })).status, 'draft');
    } finally {
      await removeTrigger();
      await cleanupFixture(fixture);
    }
  });

  await suite.test('deactivated sequential assignee fails before runtime creation', async () => {
    const fixture = await createFixture('sequential', 3, 'missing-assignee');
    try {
      await prisma.users.update({
        where: { id: fixture.approvers[2].id },
        data: { status: 'inactive' },
      });
      await assert.rejects(
        () => approvalsService.submitForApproval(
          fixture.document.id,
          fixture.workflow.id,
          fixture.tenant.id,
          fixture.owner.id,
        ),
        (error: unknown) => (error as { code?: string }).code === 'NO_APPROVERS_FOUND',
      );
      assert.equal(await prisma.workflow_instances.count({ where: { document_id: fixture.document.id } }), 0);
      assert.equal(await prisma.document_approvals.count({ where: { document_id: fixture.document.id } }), 0);
      assert.equal(await prisma.notifications.count({ where: { tenant_id: fixture.tenant.id } }), 0);
      assert.equal(await prisma.outbox_events.count({ where: { tenant_id: fixture.tenant.id } }), 0);
      assert.equal((await prisma.documents.findUniqueOrThrow({ where: { id: fixture.document.id } })).status, 'draft');
    } finally {
      await cleanupFixture(fixture);
    }
  });

  await suite.test('one inactive parallel assignee rolls back the entire activation', async () => {
    const fixture = await createFixture('parallel', 3, 'parallel-inactive-assignee');
    try {
      await prisma.users.update({
        where: { id: fixture.approvers[1].id },
        data: { status: 'inactive' },
      });
      await assert.rejects(() => approvalsService.submitForApproval(
        fixture.document.id,
        fixture.workflow.id,
        fixture.tenant.id,
        fixture.owner.id,
      ));
      assert.equal(await prisma.workflow_instances.count({ where: { document_id: fixture.document.id } }), 0);
      assert.equal(await prisma.document_approvals.count({ where: { document_id: fixture.document.id } }), 0);
      assert.equal(await prisma.outbox_events.count({ where: { tenant_id: fixture.tenant.id } }), 0);
      assert.equal(await prisma.notifications.count({ where: { tenant_id: fixture.tenant.id } }), 0);
      assert.equal((await prisma.documents.findUniqueOrThrow({ where: { id: fixture.document.id } })).status, 'draft');
    } finally {
      await cleanupFixture(fixture);
    }
  });

  await suite.test('historical approval remains immutable when its approver is deactivated', async () => {
    const fixture = await createFixture('sequential', 1, 'inactive-history');
    try {
      const step = fixture.workflow.steps[0];
      const historicalRun = await prisma.workflow_instances.create({
        data: {
          document_id: fixture.document.id,
          workflow_id: fixture.workflow.id,
          run_number: 1,
          status: 'completed',
          completed_at: new Date(),
        },
      });
      const historicalApproval = await prisma.document_approvals.create({
        data: {
          document_id: fixture.document.id,
          workflow_id: fixture.workflow.id,
          workflow_step_id: step.id,
          workflow_instance_id: historicalRun.id,
          approver_user_id: fixture.approvers[0].id,
          action: 'approved',
          acted_at: new Date(),
        },
      });
      await prisma.users.update({
        where: { id: fixture.approvers[0].id },
        data: { status: 'inactive' },
      });

      await assert.rejects(() => approvalsService.submitForApproval(
        fixture.document.id,
        fixture.workflow.id,
        fixture.tenant.id,
        fixture.owner.id,
      ));
      assert.equal((await prisma.workflow_instances.findUniqueOrThrow({ where: { id: historicalRun.id } })).status, 'completed');
      assert.equal((await prisma.document_approvals.findUniqueOrThrow({ where: { id: historicalApproval.id } })).action, 'approved');
      assert.equal(await prisma.workflow_instances.count({ where: { document_id: fixture.document.id } }), 1);
      assert.equal(await prisma.document_approvals.count({ where: { document_id: fixture.document.id } }), 1);
      assert.equal(await prisma.outbox_events.count({ where: { tenant_id: fixture.tenant.id } }), 0);
      assert.equal(await prisma.notifications.count({ where: { tenant_id: fixture.tenant.id } }), 0);
    } finally {
      await cleanupFixture(fixture);
    }
  });

  await suite.test('concurrent deactivation that commits before row revalidation prevents activation', async () => {
    const fixture = await createFixture('parallel', 2, 'concurrent-deactivation');
    let releaseDeactivation!: () => void;
    let markDeactivationReady!: () => void;
    let deactivationTransaction: Promise<unknown> | undefined;
    const deactivationReady = new Promise<void>((resolve) => { markDeactivationReady = resolve; });
    const holdDeactivation = new Promise<void>((resolve) => { releaseDeactivation = resolve; });
    try {
      deactivationTransaction = prisma.$transaction(async (tx) => {
        await tx.users.update({
          where: { id: fixture.approvers[0].id },
          data: { status: 'inactive' },
        });
        markDeactivationReady();
        await holdDeactivation;
      });
      await deactivationReady;

      // The pre-resolution SELECT sees the last committed active version. The
      // transactional FOR SHARE revalidation then waits for this update.
      const submitOutcome = approvalsService.submitForApproval(
        fixture.document.id,
        fixture.workflow.id,
        fixture.tenant.id,
        fixture.owner.id,
      ).then(
        () => ({ fulfilled: true as const, error: null }),
        (error: unknown) => ({ fulfilled: false as const, error }),
      );
      await delay(150);
      releaseDeactivation();
      await deactivationTransaction;
      const outcome = await submitOutcome;

      assert.equal(outcome.fulfilled, false);
      assert.equal((outcome.error as { code?: string }).code, 'APPROVAL_ASSIGNEE_INACTIVE');
      assert.equal(await prisma.workflow_instances.count({ where: { document_id: fixture.document.id } }), 0);
      assert.equal(await prisma.document_approvals.count({ where: { document_id: fixture.document.id } }), 0);
      assert.equal(await prisma.outbox_events.count({ where: { tenant_id: fixture.tenant.id } }), 0);
      assert.equal(await prisma.notifications.count({ where: { tenant_id: fixture.tenant.id } }), 0);
      assert.equal((await prisma.documents.findUniqueOrThrow({ where: { id: fixture.document.id } })).status, 'draft');
      assert.equal((await prisma.users.findUniqueOrThrow({ where: { id: fixture.approvers[0].id } })).status, 'inactive');
    } finally {
      releaseDeactivation?.();
      await deactivationTransaction?.catch(() => undefined);
      await cleanupFixture(fixture);
    }
  });

  await suite.test('concurrent duplicate submit creates exactly one active runtime', async () => {
    const fixture = await createFixture('parallel', 3, 'duplicate-submit');
    try {
      const results = await Promise.allSettled([
        approvalsService.submitForApproval(fixture.document.id, fixture.workflow.id, fixture.tenant.id, fixture.owner.id),
        approvalsService.submitForApproval(fixture.document.id, fixture.workflow.id, fixture.tenant.id, fixture.owner.id),
      ]);
      assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
      assert.equal(results.filter((result) => result.status === 'rejected').length, 1);
      const activeRuns = await prisma.workflow_instances.findMany({
        where: { document_id: fixture.document.id, status: 'in_progress' },
      });
      assert.equal(activeRuns.length, 1);
      assert.equal(await prisma.workflow_instances.count({ where: { document_id: fixture.document.id } }), 1);
      assert.equal(await prisma.document_approvals.count({
        where: { workflow_instance_id: activeRuns[0].id },
      }), 3);
      const activeApprovalIds = await prisma.document_approvals.findMany({
        where: { workflow_instance_id: activeRuns[0].id },
        select: { id: true },
      }).then((items) => items.map((item) => item.id));
      assert.equal(await countApprovalRequestOutbox(activeApprovalIds), 3);
      const activationOutboxes = await prisma.outbox_events.findMany({
        where: {
          event_type: 'EMAIL_DELIVERY_REQUESTED',
          aggregate_type: 'document_approval',
          aggregate_id: { in: activeApprovalIds.map(String) },
        },
        select: { deduplication_key: true },
      });
      assert.equal(new Set(activationOutboxes.map((item) => item.deduplication_key)).size, 3);
      assert.equal(await prisma.notifications.count({ where: { tenant_id: fixture.tenant.id } }), 3);
      assert.equal((await prisma.documents.findUniqueOrThrow({ where: { id: fixture.document.id } })).status, 'pending_approval');
    } finally {
      await cleanupFixture(fixture);
    }
  });

  await prisma.$disconnect();
});
