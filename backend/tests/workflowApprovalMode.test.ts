import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { afterEach, beforeEach } from "node:test";
import { prisma } from "../src/config/prisma";
import { workflowsRepository } from "../src/modules/workflows/workflows.repository";
import { workflowsService } from "../src/modules/workflows/workflows.service";
import { normalizeWorkflowApprovalMode } from "../src/modules/workflows/workflowApprovalMode";

const originalFindFirst = prisma.workflows.findFirst;
const originalCreate = workflowsRepository.create;
const originalFindById = workflowsRepository.findById;
const originalUpdate = workflowsRepository.update;

beforeEach(() => {
  (prisma.workflows as unknown as { findFirst: unknown }).findFirst = async () => null;
});

afterEach(() => {
  (prisma.workflows as unknown as { findFirst: unknown }).findFirst = originalFindFirst;
  workflowsRepository.create = originalCreate;
  workflowsRepository.findById = originalFindById;
  workflowsRepository.update = originalUpdate;
});

test("create workflow defaults approval_mode to sequential", async () => {
  let created: Record<string, unknown> | undefined;
  workflowsRepository.create = async (data: Parameters<typeof originalCreate>[0]) => {
    created = data as unknown as Record<string, unknown>;
    return data as never;
  };
  await workflowsService.createWorkflow({ name: "Default mode" }, 7, 11);
  assert.equal(created?.approval_mode, "sequential");
});

test("create workflow accepts parallel approval_mode", async () => {
  let created: Record<string, unknown> | undefined;
  workflowsRepository.create = async (data: Parameters<typeof originalCreate>[0]) => {
    created = data as unknown as Record<string, unknown>;
    return data as never;
  };
  await workflowsService.createWorkflow({ name: "Parallel", approval_mode: "parallel" }, 7, 11);
  assert.equal(created?.approval_mode, "parallel");
});

for (const [from, to] of [["sequential", "parallel"], ["parallel", "sequential"]] as const) {
  test(`update workflow changes ${from} to ${to}`, async () => {
    workflowsRepository.findById = async () => ({ id: 5, tenant_id: 7, name: "Workflow", approval_mode: from, steps: [] }) as never;
    let updated: Record<string, unknown> | undefined;
    workflowsRepository.update = async (_id, data) => {
      updated = data as unknown as Record<string, unknown>;
      return data as never;
    };
    await workflowsService.updateWorkflow(5, { approval_mode: to }, 7);
    assert.equal(updated?.approval_mode, to);
  });
}

test("workflow CRUD rejects an invalid approval_mode", async () => {
  workflowsRepository.create = async () => {
    throw new Error("repository must not be called");
  };
  await assert.rejects(
    workflowsService.createWorkflow(
      { name: "Invalid", approval_mode: "invalid" as never },
      7,
      11,
    ),
    /Invalid workflow approval mode/,
  );
  assert.throws(() => normalizeWorkflowApprovalMode("invalid"), /Invalid workflow approval mode/);
});

test("migration defaults legacy workflows to sequential", () => {
  const root = path.resolve(__dirname, "..", "..");
  const migration = fs.readFileSync(path.join(root, "prisma/migrations/20260719110000_workflow_approval_mode/migration.sql"), "utf8");
  assert.match(migration, /NOT NULL DEFAULT 'sequential'/);
  assert.match(migration, /CHECK \("approval_mode" IN \('sequential', 'parallel'\)\)/);
});

test("workflow snapshots and clones preserve approval_mode", () => {
  const root = path.resolve(__dirname, "..", "..");
  const orchestrator = fs.readFileSync(path.join(root, "src/modules/documents/documentWorkflowOrchestrator.service.ts"), "utf8");
  const documents = fs.readFileSync(path.join(root, "src/modules/documents/documents.service.ts"), "utf8");
  assert.ok((orchestrator.match(/approval_mode: template\.approval_mode/g) || []).length >= 2);
  assert.ok((documents.match(/approval_mode: template\.approval_mode/g) || []).length >= 2);
});
