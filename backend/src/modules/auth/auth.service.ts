import bcrypt from "bcryptjs";
import { createHash, randomUUID } from "crypto";
import jwt, { JwtPayload, Secret, SignOptions } from "jsonwebtoken";
import { env } from "../../config/env";
import { prisma } from "../../config/prisma";
import { ApiError } from "../../core/errors/api-error";
import { authRepository } from "./auth.repository";
import { getAuthStatusError } from "./auth-status.policy";
import { AuthResponse, AuthTokens, LoginDto, TokenPayload } from "./auth.types";

type JwtClaims = JwtPayload & {
  sub: string;
  tenantId: number;
  role?: string | null;
  jti?: string;
};

type AuthUser = {
  id: number;
  email: string;
  password_hash: string;
  status: string | null;
  tenant_id: number;
  role: string | null;
  tenant: { name: string | null; plan: string | null; status: string | null } | null;
  user_roles: Array<{ role: { name: string } | null }>;
};

type AuthRepositoryPort = {
  findByEmail(email: string): PromiseLike<AuthUser | null>;
  findById(id: number): PromiseLike<AuthUser | null>;
};

type RefreshSessionPort = {
  revokeIfActive(input: { id: string; userId: number; tenantId: number }): Promise<void>;
};

const refreshSessionPort: RefreshSessionPort = {
  async revokeIfActive({ id, userId, tenantId }) {
    await prisma.refresh_sessions.updateMany({
      where: { id, user_id: userId, tenant_id: tenantId, revoked_at: null },
      data: { revoked_at: new Date() },
    });
  },
};

export class AuthService {
  constructor(
    private readonly repository: AuthRepositoryPort = authRepository,
    private readonly sessions: RefreshSessionPort = refreshSessionPort,
  ) {}

  async login(input: LoginDto): Promise<AuthResponse> {
    const user = await this.repository.findByEmail(input.email);
    if (!user) {
      throw ApiError.unauthorized("Invalid credentials", "INVALID_CREDENTIALS");
    }
    const isMatch = await bcrypt.compare(input.password, user.password_hash);
    if (!isMatch) {
      throw ApiError.unauthorized("Invalid credentials", "INVALID_CREDENTIALS");
    }
    this.assertAuthenticationAllowed(user.status, user.tenant?.status);
    // Get primary role from user_roles (prioritize Admin role, then first role, fallback to user.role)
    const roles = user.user_roles?.map(ur => ur.role?.name).filter(Boolean) ?? [];
    const primaryRole = roles.includes('Admin') ? 'Admin' : (roles[0] ?? user.role);
    return this.buildAuthResponse(user.id, user.tenant_id, user.email, primaryRole, user.tenant?.name ?? null, user.tenant?.plan ?? null, user.tenant?.status ?? null);
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const payload = this.verifyRefreshToken(refreshToken);
    const user = await this.repository.findById(Number(payload.sub));
    if (!user) {
      throw ApiError.unauthorized("Invalid refresh token", "INVALID_REFRESH_TOKEN");
    }
    const statusError = getAuthStatusError(user.status, user.tenant?.status);
    if (statusError) {
      await this.sessions.revokeIfActive({
        id: payload.jti,
        userId: user.id,
        tenantId: user.tenant_id,
      });
      throw ApiError.forbidden(statusError.message, statusError.code);
    }
    const session = await prisma.refresh_sessions.findUnique({ where: { id: payload.jti } });
    if (!session || session.user_id !== user.id || session.tenant_id !== user.tenant_id ||
      session.revoked_at || session.expires_at <= new Date() || session.token_hash !== this.tokenHash(refreshToken)) {
      throw ApiError.unauthorized("Invalid refresh token", "INVALID_REFRESH_TOKEN");
    }
    // Get primary role from user_roles (prioritize Admin role, then first role, fallback to user.role)
    const roles = user.user_roles?.map(ur => ur.role?.name).filter(Boolean) ?? [];
    const primaryRole = roles.includes('Admin') ? 'Admin' : (roles[0] ?? user.role);
    const response = await this.buildAuthResponse(user.id, user.tenant_id, user.email, primaryRole, user.tenant?.name ?? null, user.tenant?.plan ?? null, user.tenant?.status ?? null);
    const nextSessionId = this.verifyRefreshToken(response.tokens.refreshToken).jti!;
    try {
      const revoked = await prisma.refresh_sessions.updateMany({
        where: { id: session.id, revoked_at: null },
        data: { revoked_at: new Date(), replaced_by_id: nextSessionId },
      });
      if (revoked.count !== 1) {
        throw ApiError.conflict("Refresh token was already rotated", "CONCURRENT_MODIFICATION");
      }
    } catch (error) {
      await prisma.refresh_sessions.updateMany({
        where: { id: nextSessionId, revoked_at: null },
        data: { revoked_at: new Date() },
      });
      throw error;
    }
    return response;
  }

  verifyAccessToken(token: string): TokenPayload {
    return this.verifyToken(token, env.JWT_SECRET);
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = this.verifyRefreshToken(refreshToken);
      await prisma.refresh_sessions.updateMany({
        where: { id: payload.jti, user_id: Number(payload.sub), tenant_id: payload.tenantId, revoked_at: null },
        data: { revoked_at: new Date() },
      });
    } catch {
      // Logout is idempotent; the controller always clears the browser cookie.
    }
  }

  private verifyToken(token: string, secret: string): TokenPayload {
    try {
      const decoded = jwt.verify(token, secret);
      if (typeof decoded === "string") {
        throw new Error("Malformed token payload");
      }
      const payload = decoded as JwtClaims;
      const userId = Number(payload.sub);
      if (!Number.isFinite(userId) || typeof payload.tenantId !== "number") {
        throw new Error("Missing token claims");
      }
      return {
        sub: userId,
        tenantId: payload.tenantId,
        role: payload.role ?? null,
      };
    } catch (error) {
      // Only log in development to avoid spam
      if (process.env.NODE_ENV === 'development') {
        console.error('[AUTH] Token verification failed:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          tokenPreview: token.substring(0, 20) + '...',
        });
      }
      throw ApiError.unauthorized("Invalid token", "INVALID_TOKEN");
    }
  }

  private verifyRefreshToken(token: string): JwtClaims {
    try {
      const decoded = jwt.verify(token, env.REFRESH_TOKEN_SECRET);
      if (typeof decoded === "string") throw new Error("Malformed token payload");
      const payload = decoded as JwtClaims;
      if (!payload.jti || !payload.sub || typeof payload.tenantId !== "number") {
        throw new Error("Missing refresh session claims");
      }
      return payload;
    } catch {
      throw ApiError.unauthorized("Invalid refresh token", "INVALID_REFRESH_TOKEN");
    }
  }

  private async issueTokens(userId: number, tenantId: number, role?: string | null): Promise<AuthTokens> {
    const claims: JwtClaims = {
      sub: userId.toString(),
      tenantId,
      role: role ?? null,
    };
    const accessSecret: Secret = env.JWT_SECRET;
    const refreshSecret: Secret = env.REFRESH_TOKEN_SECRET;
    const accessOptions: SignOptions = { expiresIn: env.TOKEN_EXPIRES_IN as unknown as SignOptions["expiresIn"] };
    const refreshOptions: SignOptions = { expiresIn: env.REFRESH_TOKEN_EXPIRES_IN as unknown as SignOptions["expiresIn"] };
    const accessToken = jwt.sign(claims, accessSecret, accessOptions);
    const sessionId = randomUUID();
    const refreshToken = jwt.sign({ ...claims, jti: sessionId }, refreshSecret, refreshOptions);
    const decoded = jwt.decode(refreshToken) as JwtPayload | null;
    if (!decoded?.exp) throw new Error("Refresh token expiry is missing");
    await prisma.refresh_sessions.create({
      data: {
        id: sessionId,
        user_id: userId,
        tenant_id: tenantId,
        token_hash: this.tokenHash(refreshToken),
        expires_at: new Date(decoded.exp * 1000),
      },
    });
    return { accessToken, refreshToken };
  }

  private tokenHash(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  private assertAuthenticationAllowed(
    userStatus: string | null | undefined,
    tenantStatus: string | null | undefined,
  ): void {
    const statusError = getAuthStatusError(userStatus, tenantStatus);
    if (statusError) {
      throw ApiError.forbidden(statusError.message, statusError.code);
    }
  }

  private async buildAuthResponse(
    userId: number,
    tenantId: number,
    email: string,
    role: string | null | undefined,
    tenantName: string | null,
    tenantPlan: string | null,
    tenantStatus: string | null,
  ): Promise<AuthResponse> {
    const tokens = await this.issueTokens(userId, tenantId, role);
    return {
      tokens,
      user: {
        id: userId,
        email,
        role: role ?? null,
      },
      tenant: {
        id: tenantId,
        name: tenantName,
        plan: tenantPlan,
        status: tenantStatus,
      },
    };
  }
}

export const authService = new AuthService();
