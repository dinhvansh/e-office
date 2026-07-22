import { Request, Response } from 'express';
import { z } from 'zod';
import { departmentsService } from './departments.service';
import { AppError } from '../../utils/errors';
import { organizationStructureService, type OrganizationStructureInput } from './organization-structure.service';

const idSchema = z.coerce.number().int().positive();
const departmentPayloadSchema = z.object({
  code: z.string().trim().max(50).optional(),
  name: z.string().trim().min(1, 'Department name is required'),
  parent_id: z.number().int().positive().nullable().optional(),
  manager_id: z.number().int().positive().nullable().optional(),
  support_manager_ids: z.array(z.number().int().positive()).max(20).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  is_active: z.boolean().optional(),
});

const updateDepartmentPayloadSchema = departmentPayloadSchema.partial();
const organizationStructureSchema = z.object({
  manager_id: z.number().int().positive().nullable(),
  support_manager_ids: z.array(z.number().int().positive()).max(20).default([]),
  members: z.array(z.object({
    user_id: z.number().int().positive(),
    position_id: z.number().int().positive().nullable(),
    manager_id: z.number().int().positive().nullable(),
  })).max(1000),
  manager_replacements: z.array(z.object({
    department_id: z.number().int().positive(),
    outgoing_user_id: z.number().int().positive(),
    replacement_user_id: z.number().int().positive(),
  })).default([]),
});
type CreateDepartmentInput = {
  name: string;
  code?: string;
  parent_id?: number | null;
  manager_id?: number | null;
  support_manager_ids?: number[];
  description?: string | null;
  is_active?: boolean;
};
const errorMessage = (error: unknown): string => error instanceof Error ? error.message : 'Unexpected error';

export const departmentsController = {
  async getOrganizationStructure(req: Request, res: Response) {
    try {
      const data = await organizationStructureService.get(req.auth!.tenantId, idSchema.parse(req.params.id));
      res.json({ success: true, data });
    } catch (error: unknown) {
      const appError = error instanceof AppError ? error : null;
      res.status(appError?.statusCode ?? 400).json({ success: false, error: { code: appError?.code ?? 'ORGANIZATION_LOAD_FAILED', message: errorMessage(error), details: appError?.details } });
    }
  },

  async updateOrganizationStructure(req: Request, res: Response) {
    try {
      const payload = organizationStructureSchema.parse(req.body) as OrganizationStructureInput;
      const data = await organizationStructureService.update(req.auth!.tenantId, idSchema.parse(req.params.id), payload);
      res.json({ success: true, data });
    } catch (error: unknown) {
      const appError = error instanceof AppError ? error : null;
      res.status(appError?.statusCode ?? 400).json({ success: false, error: { code: appError?.code ?? 'ORGANIZATION_UPDATE_FAILED', message: errorMessage(error), details: appError?.details } });
    }
  },

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
      const appError = error instanceof AppError ? error : null;
      res.status(appError?.statusCode ?? 400).json({
        success: false,
        error: {
          code: appError?.code ?? 'DEPARTMENT_DELETE_FAILED',
          message: errorMessage(error),
        },
      });
    }
  },
};
