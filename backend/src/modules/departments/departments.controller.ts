import { Request, Response } from 'express';
import { departmentsService } from './departments.service';

export const departmentsController = {
  async getDepartments(req: Request, res: Response) {
    try {
      const tenantId = (req as any).auth.tenantId;
      const departments = await departmentsService.getDepartments(tenantId);
      res.json({ success: true, data: departments });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getDepartmentTree(req: Request, res: Response) {
    try {
      const tenantId = (req as any).auth.tenantId;
      const tree = await departmentsService.getDepartmentTree(tenantId);
      res.json({ success: true, data: tree });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getDepartmentById(req: Request, res: Response) {
    try {
      const tenantId = (req as any).auth.tenantId;
      const { id } = req.params;
      const department = await departmentsService.getDepartmentById(parseInt(id), tenantId);
      res.json({ success: true, data: department });
    } catch (error: any) {
      res.status(404).json({ success: false, error: error.message });
    }
  },

  async createDepartment(req: Request, res: Response) {
    try {
      const tenantId = (req as any).auth.tenantId;
      const department = await departmentsService.createDepartment(tenantId, req.body);
      res.status(201).json({ success: true, data: department });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  async updateDepartment(req: Request, res: Response) {
    try {
      const tenantId = (req as any).auth.tenantId;
      const { id } = req.params;
      const department = await departmentsService.updateDepartment(parseInt(id), tenantId, req.body);
      res.json({ success: true, data: department });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  async deleteDepartment(req: Request, res: Response) {
    try {
      const tenantId = (req as any).auth.tenantId;
      const { id } = req.params;
      await departmentsService.deleteDepartment(parseInt(id), tenantId);
      res.json({ success: true, message: 'Department deleted' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },
};
