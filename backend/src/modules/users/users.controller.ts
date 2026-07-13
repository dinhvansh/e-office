import { Request, Response } from 'express';
import { usersService } from './users.service';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unexpected error';
}

export const usersController = {
  async getUsers(req: Request, res: Response) {
    try {
      const user = req.user;
      const tenantId = req.auth!.tenantId;
      
      // Check if user is super admin
      const isSuperAdmin = user?.role === 'super_admin';
      
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;
      const filters = {
        department_id: req.query.department_id ? parseInt(req.query.department_id as string) : undefined,
        role: req.query.role as string,
        status: req.query.status as string,
        search: req.query.search as string,
      };
      
      const result = await usersService.getUsers(isSuperAdmin ? null : tenantId, { ...filters, page, limit });
      res.json({ success: true, data: result });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: errorMessage(error) });
    }
  },

  // ✅ NEW: Get only active users (for dropdowns/selectors)
  async getActiveUsers(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const users = await usersService.getActiveUsers(tenantId);
      res.json(users); // Return array directly for backward compatibility
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: errorMessage(error) });
    }
  },

  async getDirectoryUsers(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const users = await usersService.getDirectoryUsers(tenantId, search);
      res.json({ success: true, data: { users } });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: errorMessage(error) });
    }
  },

  async getUserById(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const { id } = req.params;
      const user = await usersService.getUserById(parseInt(id), tenantId);
      res.json({ success: true, data: user });
    } catch (error: unknown) {
      res.status(404).json({ success: false, error: errorMessage(error) });
    }
  },

  async createUser(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const user = await usersService.createUser(tenantId, req.body);
      res.status(201).json({ success: true, data: user });
    } catch (error: unknown) {
      res.status(400).json({ success: false, error: errorMessage(error) });
    }
  },

  async updateUser(req: Request, res: Response) {
    try {
      const user = req.user;
      const tenantId = req.auth!.tenantId;
      
      // Check if user is super admin
      const isSuperAdmin = user?.role === 'super_admin';
      
      const { id } = req.params;
      const updatedUser = await usersService.updateUser(parseInt(id), isSuperAdmin ? null : tenantId, req.body);
      res.json({ success: true, data: updatedUser });
    } catch (error: unknown) {
      res.status(400).json({ success: false, error: errorMessage(error) });
    }
  },

  async deleteUser(req: Request, res: Response) {
    try {
      const user = req.user;
      const tenantId = req.auth!.tenantId;
      
      // Check if user is super admin (can delete from any tenant)
      const isSuperAdmin = user?.role === 'super_admin';
      
      const { id } = req.params;
      await usersService.deleteUser(parseInt(id), isSuperAdmin ? null : tenantId);
      res.json({ success: true, message: 'User deleted' });
    } catch (error: unknown) {
      res.status(400).json({ success: false, error: errorMessage(error) });
    }
  },

  async getUserStats(req: Request, res: Response) {
    try {
      const tenantId = req.auth!.tenantId;
      const stats = await usersService.getUserStats(tenantId);
      res.json({ success: true, data: stats });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: errorMessage(error) });
    }
  },

  async changePassword(req: Request, res: Response) {
    try {
      const userId = req.auth!.userId;
      const tenantId = req.auth!.tenantId;
      const { old_password, new_password } = req.body;

      if (!old_password || !new_password) {
        return res.status(400).json({ 
          success: false, 
          error: 'Old password and new password are required' 
        });
      }

      await usersService.changePassword(userId, tenantId, old_password, new_password);
      res.json({ success: true, message: 'Password changed successfully' });
    } catch (error: unknown) {
      res.status(400).json({ success: false, error: errorMessage(error) });
    }
  },

  async getProfile(req: Request, res: Response) {
    try {
      const userId = req.auth!.userId;
      const tenantId = req.auth!.tenantId;
      const user = await usersService.getUserById(userId, tenantId);
      res.json({ success: true, data: user });
    } catch (error: unknown) {
      res.status(404).json({ success: false, error: errorMessage(error) });
    }
  },
};
