import { NextFunction, Request, Response } from "express";
import { ApiError } from "../../core/errors/api-error";
import { authRepository } from "./auth.repository";
import { authService } from "./auth.service";

export const authGuard = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    // Try to get token from header first, then from query string
    let token: string | undefined;
    
    const header = req.headers.authorization;
    if (header && header.startsWith("Bearer ")) {
      token = header.replace("Bearer ", "").trim();
    } else if (req.query.token && typeof req.query.token === 'string') {
      // Support token in query string for iframe/embed scenarios
      token = req.query.token.trim();
    }
    
    if (!token || token === "null" || token === "undefined") {
      throw ApiError.unauthorized("Missing token", "TOKEN_REQUIRED");
    }
    const payload = authService.verifyAccessToken(token);
    const user = await authRepository.findById(payload.sub);
    if (!user || user.tenant_id !== payload.tenantId) {
      throw ApiError.unauthorized("Invalid token context", "INVALID_TOKEN_CONTEXT");
    }
    if (user.status === "disabled") {
      throw ApiError.forbidden("User disabled", "USER_DISABLED");
    }
    req.auth = {
      userId: user.id,
      tenantId: user.tenant_id,
      role: user.role,
    };
    req.user = user;
    req.tenant = user.tenant ?? undefined;
    next();
  } catch (error) {
    next(error);
  }
};
