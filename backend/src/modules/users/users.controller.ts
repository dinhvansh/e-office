import { Request, Response } from 'express';
import { usersService } from './users.service';

export const usersController = {
  async getUsers(req: Request, res: Response) {
    try {
      const tenantId = (req as any).auth.tenantId;
      const filters = {
        department_id: req.query.department_id ? parseInt(req.query.department_id as string) : undefined,
        role: req.query.role as string,
        status: req.query.status as string,
        search: req.query.search as string,
      };
      
      const users = await usersService.getUsers(tenantId, filters);
      res.json({ success: true, data: users });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getUserById(req: Request, res: Response) {
    try {
      const tenantId = (req as any).auth.tenantId;
      const { id } = req.params;
      const user = await usersService.getUserById(parseInt(id), tenantId);
      res.json({ success: true, data: user });
    } catch (error: any) {
      res.status(404).json({ success: false, error: error.message });
    }
  },

  async createUser(req: Request, res: Response) {
    try {
      const tenantId = (req as any).auth.tenantId;
      const user = await usersService.createUser(tenantId, req.body);
      res.status(201).json({ success: true, data: user });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  async updateUser(req: Request, res: Response) {
    try {
      const tenantId = (req as any).auth.tenantId;
      const { id } = req.params;
      const user = await usersService.updateUser(parseInt(id), tenantId, req.body);
      res.json({ success: true, data: user });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  async deleteUser(req: Request, res: Response) {
    try {
      const tenantId = (req as any).auth.tenantId;
      const { id } = req.params;
      await usersService.deleteUser(parseInt(id), tenantId);
      res.json({ success: true, message: 'User deleted' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  async getUserStats(req: Request, res: Response) {
    try {
      const tenantId = (req as any).auth.tenantId;
      const stats = await usersService.getUserStats(tenantId);
      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async changePassword(req: Request, res: Response) {
    try {
      const userId = (req as any).auth.userId;
      const tenantId = (req as any).auth.tenantId;
      const { old_password, new_password } = req.body;

      if (!old_password || !new_password) {
        return res.status(400).json({ 
          success: false, 
          error: 'Old password and new password are required' 
        });
      }

      await usersService.changePassword(userId, tenantId, old_password, new_password);
      res.json({ success: true, message: 'Password changed successfully' });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  async getProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).auth.userId;
      const tenantId = (req as any).auth.tenantId;
      const user = await usersService.getUserById(userId, tenantId);
      res.json({ success: true, data: user });
    } catch (error: any) {
      res.status(404).json({ success: false, error: error.message });
    }
  },
};
