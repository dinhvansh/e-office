import { Request, Response } from "express";
import { z } from "zod";
import { ApiError } from "../../core/errors/api-error";
import { ok } from "../../core/utils/response";
import { authService } from "./auth.service";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(10),
});

export class AuthController {
  login = async (req: Request, res: Response): Promise<void> => {
    const body = loginSchema.parse(req.body);
    const result = await authService.login(body);
    res.json(ok(result));
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const body = refreshSchema.parse(req.body);
    const result = await authService.refresh(body.refresh_token);
    res.json(ok(result));
  };

  me = async (req: Request, res: Response): Promise<void> => {
    if (!req.user || !req.tenant) {
      throw ApiError.unauthorized();
    }
    res.json(
      ok({
        user: {
          id: req.user.id,
          email: req.user.email,
          role: req.user.role,
        },
        tenant: {
          id: req.tenant.id,
          name: req.tenant.name,
          plan: req.tenant.plan,
        },
      }),
    );
  };
}
