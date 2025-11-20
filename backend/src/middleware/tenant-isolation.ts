import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../core/errors/api-error';

/**
 * Middleware to ensure tenant isolation in all queries
 * This should be used after authGuard to ensure req.auth is populated
 */
export const ensureTenantIsolation = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.auth?.tenantId) {
    throw ApiError.unauthorized('Tenant context required', 'TENANT_REQUIRED');
  }
  
  // Add tenant_id to query params for easy access
  req.query.tenant_id = String(req.auth.tenantId);
  
  next();
};

/**
 * Helper function to validate tenant ownership of a resource
 */
export function validateTenantOwnership(
  resourceTenantId: number | null | undefined,
  requestTenantId: number
): void {
  if (!resourceTenantId || resourceTenantId !== requestTenantId) {
    throw ApiError.forbidden(
      'Access denied: Resource belongs to different tenant',
      'TENANT_MISMATCH'
    );
  }
}

/**
 * Helper to add tenant_id to Prisma where clause
 */
export function withTenantId<T extends Record<string, any>>(
  where: T,
  tenantId: number
): T & { tenant_id: number } {
  return {
    ...where,
    tenant_id: tenantId,
  };
}
