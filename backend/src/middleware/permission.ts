import { Request, Response, NextFunction } from 'express';
import { rolesService } from '../modules/roles/roles.service';

const errorMessage = (error: unknown): string => error instanceof Error ? error.message : 'Unexpected error';

export const requirePermission = (resource: string, action: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.auth?.userId;
      
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
    } catch (error: unknown) {
      res.status(500).json({ 
        success: false, 
        error: errorMessage(error)
      });
    }
  };
};

// Helper to check multiple permissions (OR logic)
export const requireAnyPermission = (...permissions: Array<[string, string]>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.auth?.userId;
      
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
    } catch (error: unknown) {
      res.status(500).json({ 
        success: false, 
        error: errorMessage(error)
      });
    }
  };
};

// Helper to check multiple permissions (AND logic)
export const requireAllPermissions = (...permissions: Array<[string, string]>) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.auth?.userId;
      if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

      for (const [resource, action] of permissions) {
        if (!await rolesService.checkPermission(userId, resource, action)) {
          return res.status(403).json({ success: false, error: `Permission denied: ${resource}:${action}` });
        }
      }
      next();
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: errorMessage(error) });
    }
  };
};
