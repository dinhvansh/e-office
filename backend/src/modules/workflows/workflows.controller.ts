import { Request, Response } from 'express';
import { z } from 'zod';
import { ok } from '../../core/utils/response';
import { workflowsService } from './workflows.service';

const createWorkflowSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  document_type_id: z.coerce.number().int().positive().optional(),
});

const updateWorkflowSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  document_type_id: z.coerce.number().int().positive().optional(),
  is_active: z.boolean().optional(),
});

const createStepSchema = z.object({
  step_name: z.string().min(1),
  approver_type: z.enum(['user', 'role', 'department', 'manager']),
  approver_id: z.coerce.number().int().positive().optional(),
  due_in_days: z.coerce.number().int().positive().optional(),
  is_required: z.boolean().optional(),
  conditions: z.any().optional(),
});

const updateStepSchema = z.object({
  step_name: z.string().min(1).optional(),
  approver_type: z.enum(['user', 'role', 'department', 'manager']).optional(),
  approver_id: z.coerce.number().int().positive().optional(),
  due_in_days: z.coerce.number().int().positive().optional(),
  is_required: z.boolean().optional(),
  conditions: z.any().optional(),
});

const reorderStepsSchema = z.object({
  steps: z.array(
    z.object({
      id: z.number().int().positive(),
      step_order: z.number().int().positive(),
    })
  ),
});

const idSchema = z.coerce.number().int().positive();

export class WorkflowsController {
  // Workflows
  list = async (req: Request, res: Response): Promise<void> => {
    const workflows = await workflowsService.listWorkflows(req.auth!.tenantId);
    res.json(ok({ workflows }));
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const id = idSchema.parse(req.params.id);
    const workflow = await workflowsService.getWorkflow(id, req.auth!.tenantId);
    res.json(ok({ workflow }));
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const body = createWorkflowSchema.parse(req.body);
    const workflow = await workflowsService.createWorkflow(
      body,
      req.auth!.tenantId,
      req.auth!.userId
    );
    res.status(201).json(ok({ workflow }));
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const id = idSchema.parse(req.params.id);
    const body = updateWorkflowSchema.parse(req.body);
    const workflow = await workflowsService.updateWorkflow(id, body, req.auth!.tenantId);
    res.json(ok({ workflow }));
  };

  delete = async (req: Request, res: Response): Promise<void> => {
    const id = idSchema.parse(req.params.id);
    await workflowsService.deleteWorkflow(id, req.auth!.tenantId);
    res.json(ok({ deleted: true }));
  };

  // Workflow Steps
  getSteps = async (req: Request, res: Response): Promise<void> => {
    const workflowId = idSchema.parse(req.params.id);
    const steps = await workflowsService.getWorkflowSteps(workflowId, req.auth!.tenantId);
    res.json(ok({ steps }));
  };

  createStep = async (req: Request, res: Response): Promise<void> => {
    const workflowId = idSchema.parse(req.params.id);
    const body = createStepSchema.parse(req.body);
    const step = await workflowsService.createWorkflowStep(
      workflowId,
      body,
      req.auth!.tenantId
    );
    res.status(201).json(ok({ step }));
  };

  updateStep = async (req: Request, res: Response): Promise<void> => {
    const stepId = idSchema.parse(req.params.stepId);
    const body = updateStepSchema.parse(req.body);
    const step = await workflowsService.updateWorkflowStep(stepId, body, req.auth!.tenantId);
    res.json(ok({ step }));
  };

  deleteStep = async (req: Request, res: Response): Promise<void> => {
    const stepId = idSchema.parse(req.params.stepId);
    await workflowsService.deleteWorkflowStep(stepId, req.auth!.tenantId);
    res.json(ok({ deleted: true }));
  };

  reorderSteps = async (req: Request, res: Response): Promise<void> => {
    const workflowId = idSchema.parse(req.params.id);
    const body = reorderStepsSchema.parse(req.body);
    const steps = await workflowsService.reorderWorkflowSteps(
      workflowId,
      body.steps,
      req.auth!.tenantId
    );
    res.json(ok({ steps }));
  };

  // Helpers
  getAvailableApprovers = async (req: Request, res: Response): Promise<void> => {
    const approvers = await workflowsService.getAvailableApprovers(req.auth!.tenantId);
    res.json(ok(approvers));
  };
}

export const workflowsController = new WorkflowsController();
