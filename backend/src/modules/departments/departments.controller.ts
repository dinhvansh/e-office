import { Request, Response } from 'express';
import { z } from 'zod';
import { departmentsService } from './departments.service';

const idSchema = z.coerce.number().int().positive();
const departmentPayloadSchema = z.object({
  code: z.string().trim().max(50).optional(),
  name: z.string().trim().min(1, 'Department name is required'),
  parent_id: z.number().int().positive().nullable().optional(),
  manager_id: z.number().int().positive().nullable().optional(),
  description: z.string().trim().max(500).nullable().optional(),
});

const updateDepartmentPayloadSchema = departmentPayloadSchema.partial();
type CreateDepartmentInput = {
  name: string;
  code?: string;
  parent_id?: number | null;
  manager_id?: number | null;
  description?: string | null;
};
const errorMessage = (error: unknown): string => error instanceof Error ? error.message : 'Unexpected error';

export const departmentsController = {
  async getDepartments(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const departments = await departmentsService.getDepartments(tenantId);
      res.json({ success: true, data: departments });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: errorMessage(error) });
    }
  },

  async getDepartmentTree(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const tree = await departmentsService.getDepartmentTree(tenantId);
      res.json({ success: true, data: tree });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: errorMessage(error) });
    }
  },

  async getDepartmentById(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const id = idSchema.parse(req.params.id);
      const department = await departmentsService.getDepartmentById(id, tenantId);
      res.json({ success: true, data: department });
    } catch (error: unknown) {
      res.status(404).json({ success: false, error: errorMessage(error) });
    }
  },

  async createDepartment(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const payload = departmentPayloadSchema.parse(req.body) as CreateDepartmentInput;
      const department = await departmentsService.createDepartment(tenantId, payload);
      res.status(201).json({ success: true, data: department });
    } catch (error: unknown) {
      res.status(400).json({ success: false, error: errorMessage(error) });
    }
  },

  async updateDepartment(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const id = idSchema.parse(req.params.id);
      const payload = updateDepartmentPayloadSchema.parse(req.body);
      const department = await departmentsService.updateDepartment(id, tenantId, payload);
      res.json({ success: true, data: department });
    } catch (error: unknown) {
      res.status(400).json({ success: false, error: errorMessage(error) });
    }
  },

  async deleteDepartment(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const id = idSchema.parse(req.params.id);
      await departmentsService.deleteDepartment(id, tenantId);
      res.json({ success: true, message: 'Department deleted' });
    } catch (error: unknown) {
      res.status(400).json({ success: false, error: errorMessage(error) });
    }
  },
};
