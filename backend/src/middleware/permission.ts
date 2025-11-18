import { Request, Response, NextFunction } from 'express';
import { rolesService } from '../modules/roles/roles.service';

export const requirePermission = (resource: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).auth?.userId;
      
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          error: 'Unauthorized' 
        });
      }

      const hasPermission = await rolesService.checkPermission(userId, resource, action);
      
      if (!hasPermission) {
        return res.status(403).json({ 
          success: false, 
          error: `Permission denied: ${resource}:${action}` 
        });
      }

      next();
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  };
};

// Helper to check multiple permissions (OR logic)
export const requireAnyPermission = (...permissions: Array<[string, string]>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).auth?.userId;
      
      if (!userId) {
        return res.status(401).json({ 
          success: false, 
          error: 'Unauthorized' 
        });
      }

      for (const [resource, action] of permissions) {
        const hasPermission = await rolesService.checkPermission(userId, resource, action);
        if (hasPermission) {
          return next();
        }
      }

      return res.status(403).json({ 
        success: false, 
        error: 'Permission denied' 
      });
    } catch (error: any) {
      res.status(500).json({ 
        success: false, 
        error: error.message 
      });
    }
  };
};
