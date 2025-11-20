import { Request, Response } from 'express';
import { rolesService } from './roles.service';

export const rolesController = {
  async getRoles(req: Request, res: Response) {
    try {
      const tenantId = (req as any).auth.tenantId;
      const roles = await rolesService.getRoles(tenantId);
      res.json({ success: true, data: roles });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getRoleById(req: Request, res: Response) {
    try {
      const tenantId = (req as any).auth.tenantId;
      const { id } = req.params;
      const role = await rolesService.getRoleById(parseInt(id), tenantId);
      res.json({ success: true, data: role });
    } catch (error: any) {
      res.status(404).json({ success: false, error: error.message });
    }
  },

  async createRole(req: Request, res: Response) {
    try {
      const tenantId = (req as any).auth.tenantId;
      const role = await rolesService.createRole(tenantId, req.body);
      res.status(201).json({ success: true, data: role });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  async updateRole(req: Request, res: Response) {
    try {
      const tenantId = (req as any).auth.tenantId;
      const { id } = req.params;
      const role = await rolesService.updateRole(parseInt(id), tenantId, req.body);
      res.json({ success: true, data: role });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  async deleteRole(req: Request, res: Response) {
    try {
      const tenantId = (req as any).auth.tenantId;
      const { id } = req.params;
      await rolesService.deleteRole(parseInt(id), tenantId);
      res.json({ success: true, message: 'Role deleted' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  async getAllPermissions(req: Request, res: Response) {
    try {
      const permissions = await rolesService.getAllPermissions();
      res.json({ success: true, data: permissions });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getUserPermissions(req: Request, res: Response) {
    try {
      const userId = (req as any).auth.userId;
      const permissions = await rolesService.getUserPermissions(userId);
      res.json({ success: true, data: permissions });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async removePermission(req: Request, res: Response) {
    try {
      const tenantId = (req as any).auth.tenantId;
      const { id, permissionId } = req.params;
      await rolesService.removePermission(parseInt(id), parseInt(permissionId), tenantId);
      res.json({ success: true, message: 'Permission removed from role' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },
};
