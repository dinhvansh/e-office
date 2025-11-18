import { NextFunction, Request, Response } from "express";
import { ApiError } from "../../core/errors/api-error";
import { authRepository } from "./auth.repository";
import { authService } from "./auth.service";

export const authGuard = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    throw ApiError.unauthorized("Missing authorization header", "AUTH_HEADER_REQUIRED");
  }
  const token = header.replace("Bearer ", "").trim();
  if (!token) {
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
};
