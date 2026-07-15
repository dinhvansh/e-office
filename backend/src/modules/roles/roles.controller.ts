import { Request, Response } from 'express';
import { rolesService } from './roles.service';

const errorMessage = (error: unknown): string => error instanceof Error ? error.message : 'Unexpected error';
const authFor = (req: Request) => {
  if (!req.auth) throw new Error('Authentication context is required');
  return req.auth;
};

export const rolesController = {
  async getRoles(req: Request, res: Response) {
    try {
      const tenantId = authFor(req).tenantId;
      const roles = await rolesService.getRoles(tenantId);
      res.json({ success: true, data: roles });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: errorMessage(error) });
    }
  },

  async getRoleById(req: Request, res: Response) {
    try {
      const tenantId = authFor(req).tenantId;
      const { id } = req.params;
      const role = await rolesService.getRoleById(parseInt(id), tenantId);
      res.json({ success: true, data: role });
    } catch (error: unknown) {
      res.status(404).json({ success: false, error: errorMessage(error) });
    }
  },

  async createRole(req: Request, res: Response) {
    try {
      const tenantId = authFor(req).tenantId;
      const role = await rolesService.createRole(tenantId, req.body);
      res.status(201).json({ success: true, data: role });
    } catch (error: unknown) {
      res.status(400).json({ success: false, error: errorMessage(error) });
    }
  },

  async updateRole(req: Request, res: Response) {
    try {
      const tenantId = authFor(req).tenantId;
      const { id } = req.params;
      const role = await rolesService.updateRole(parseInt(id), tenantId, req.body);
      res.json({ success: true, data: role });
    } catch (error: unknown) {
      res.status(400).json({ success: false, error: errorMessage(error) });
    }
  },

  async deleteRole(req: Request, res: Response) {
    try {
      const tenantId = authFor(req).tenantId;
      const { id } = req.params;
      await rolesService.deleteRole(parseInt(id), tenantId);
      res.json({ success: true, message: 'Role deleted' });
    } catch (error: unknown) {
      res.status(400).json({ success: false, error: errorMessage(error) });
    }
  },

  async getAllPermissions(req: Request, res: Response) {
    try {
      const permissions = await rolesService.getAllPermissions();
      res.json({ success: true, data: permissions });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: errorMessage(error) });
    }
  },

  async getUserPermissions(req: Request, res: Response) {
    try {
      const userId = authFor(req).userId;
      const permissions = await rolesService.getUserPermissions(userId);
      res.json({ success: true, data: permissions });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: errorMessage(error) });
    }
  },

  async removePermission(req: Request, res: Response) {
    try {
      const tenantId = authFor(req).tenantId;
      const { id, permissionId } = req.params;
      await rolesService.removePermission(parseInt(id), parseInt(permissionId), tenantId);
      res.json({ success: true, message: 'Permission removed from role' });
    } catch (error: unknown) {
      res.status(400).json({ success: false, error: errorMessage(error) });
    }
  },

  async getRoleUsers(req: Request, res: Response) {
    try {
      const tenantId = authFor(req).tenantId;
      const roleId = parseInt(req.params.id);
      const users = await rolesService.getRoleUsers(roleId, tenantId);
      res.json({ success: true, data: { users } });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: { message: errorMessage(error) } });
    }
  },
};
