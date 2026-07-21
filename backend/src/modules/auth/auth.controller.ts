import { Request, Response } from "express";
import { z } from "zod";
import { ApiError } from "../../core/errors/api-error";
import { ok } from "../../core/utils/response";
import { env } from "../../config/env";
import { authService } from "./auth.service";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(10).optional(),
});

const parseCookie = (cookieHeader?: string): Record<string, string> => {
  if (!cookieHeader) return {};
  return cookieHeader.split(";").reduce<Record<string, string>>((acc, part) => {
    const [key, ...rest] = part.trim().split("=");
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join("="));
    return acc;
  }, {});
};

const setRefreshCookie = (res: Response, refreshToken: string) => {
  const secure = env.AUTH_COOKIE_SECURE === "true";
  const sameSite = env.AUTH_COOKIE_SAME_SITE as "lax" | "strict" | "none";
  const parts = [
    `${env.AUTH_COOKIE_NAME}=${encodeURIComponent(refreshToken)}`,
    "HttpOnly",
    "Path=/api/v1/auth",
    `SameSite=${sameSite}`,
    `Max-Age=${7 * 24 * 60 * 60}`,
  ];
  if (secure) parts.push("Secure");
  if (env.AUTH_COOKIE_DOMAIN) parts.push(`Domain=${env.AUTH_COOKIE_DOMAIN}`);
  res.setHeader("Set-Cookie", parts.join("; "));
};

const clearRefreshCookie = (res: Response) => {
  const secure = env.AUTH_COOKIE_SECURE === "true";
  const sameSite = env.AUTH_COOKIE_SAME_SITE as "lax" | "strict" | "none";
  const parts = [
    `${env.AUTH_COOKIE_NAME}=`,
    "HttpOnly",
    "Path=/api/v1/auth",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    `SameSite=${sameSite}`,
  ];
  if (secure) parts.push("Secure");
  if (env.AUTH_COOKIE_DOMAIN) parts.push(`Domain=${env.AUTH_COOKIE_DOMAIN}`);
  res.setHeader("Set-Cookie", parts.join("; "));
};

const respondWithCookieAuth = (res: Response, result: Awaited<ReturnType<typeof authService.login>>): void => {
  setRefreshCookie(res, result.tokens.refreshToken);
  // The refresh token is intentionally cookie-only. Returning it in the body
  // defeats the HttpOnly storage boundary and makes it easy to persist in JS.
  res.json(ok({
    ...result,
    tokens: { accessToken: result.tokens.accessToken },
  }));
};

export class AuthController {
  login = async (req: Request, res: Response): Promise<void> => {
    const body = loginSchema.parse(req.body) as { email: string; password: string };
    const result = await authService.login(body);
    respondWithCookieAuth(res, result);
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const body = refreshSchema.parse(req.body ?? {});
    const cookies = parseCookie(req.headers.cookie);
    const refreshToken = body.refresh_token ?? cookies[env.AUTH_COOKIE_NAME];
    if (!refreshToken) {
      throw ApiError.unauthorized("Missing refresh token", "REFRESH_TOKEN_REQUIRED");
    }
    const result = await authService.refresh(refreshToken);
    respondWithCookieAuth(res, result);
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    const body = refreshSchema.parse(req.body ?? {});
    const cookies = parseCookie(req.headers.cookie);
    const refreshToken = body.refresh_token ?? cookies[env.AUTH_COOKIE_NAME];
    if (refreshToken) {
      await authService.logout(refreshToken);
    }
    clearRefreshCookie(res);
    res.json(ok({ logged_out: true }));
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
          full_name: req.user.full_name,
          phone: req.user.phone,
          avatar_url: req.user.avatar_url ? '/users/profile/avatar' : null,
          signature_image_url: req.user.signature_image_path ? '/users/profile/signature' : null,
          signature_type: req.user.signature_type,
          signature_updated_at: req.user.signature_updated_at,
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
