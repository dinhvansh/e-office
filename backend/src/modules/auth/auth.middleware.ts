import { NextFunction, Request, Response } from "express";
import { ApiError } from "../../core/errors/api-error";
import { authRepository } from "./auth.repository";
import { authService } from "./auth.service";
import { apiTokensService } from "../webhooks/apiTokens.service";

export const authGuard = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    // Only accept bearer token from Authorization header to avoid token leakage in URLs/logs
    let token: string | undefined;

    const header = req.headers.authorization;
    if (header && header.startsWith("Bearer ")) {
      token = header.replace("Bearer ", "").trim();
    }

    if (!token || token === "null" || token === "undefined") {
      throw ApiError.unauthorized("Missing token", "TOKEN_REQUIRED");
    }

    let user = null;
    let tenantId: number | null = null;
    let role: string | null | undefined = null;

    try {
      const payload = authService.verifyAccessToken(token);
      user = await authRepository.findById(payload.sub);
      tenantId = payload.tenantId;
      role = payload.role ?? null;
    } catch {
      const apiToken = await apiTokensService.authenticate(token);
      if (apiToken) {
        user = await authRepository.findById(apiToken.created_by_user_id);
        tenantId = apiToken.tenant_id;
        role = user?.role ?? null;
        void apiTokensService.touchLastUsed(apiToken.tenant_id, apiToken.id);
      }
    }

    if (!user || user.tenant_id !== tenantId) {
      throw ApiError.unauthorized("Invalid token context", "INVALID_TOKEN_CONTEXT");
    }
    if (user.status === "disabled") {
      throw ApiError.forbidden("User disabled", "USER_DISABLED");
    }
    req.auth = {
      userId: user.id,
      tenantId: user.tenant_id,
      role,
    };
    req.user = user;
    req.tenant = user.tenant ?? undefined;
    next();
  } catch (error) {
    next(error);
  }
};
