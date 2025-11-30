import { Request, Response } from "express";
import { ok } from "../../core/utils/response";
import { tenantsService } from "./tenants.service";

export class TenantsController {
  me = async (req: Request, res: Response): Promise<void> => {
    const tenant = await tenantsService.getTenantProfile(req.auth!.tenantId);
    res.json(
      ok({
        tenant: {
          id: tenant.id,
          name: tenant.name,
          domain: tenant.domain,
          plan: tenant.plan,
          status: tenant.status,
          created_at: tenant.created_at,
        },
      }),
    );
  };

  stats = async (req: Request, res: Response): Promise<void> => {
    const stats = await tenantsService.getTenantStats(req.auth!.tenantId);
    res.json(ok({ stats }));
  };
}
