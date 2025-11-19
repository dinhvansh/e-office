import bcrypt from "bcryptjs";
import jwt, { JwtPayload, Secret, SignOptions } from "jsonwebtoken";
import { env } from "../../config/env";
import { ApiError } from "../../core/errors/api-error";
import { authRepository } from "./auth.repository";
import { AuthResponse, AuthTokens, LoginDto, TokenPayload } from "./auth.types";

type JwtClaims = JwtPayload & {
  sub: string;
  tenantId: number;
  role?: string | null;
};

class AuthService {
  async login(input: LoginDto): Promise<AuthResponse> {
    const user = await authRepository.findByEmail(input.email);
    if (!user) {
      throw ApiError.unauthorized("Invalid credentials", "INVALID_CREDENTIALS");
    }
    const isMatch = await bcrypt.compare(input.password, user.password_hash);
    if (!isMatch) {
      throw ApiError.unauthorized("Invalid credentials", "INVALID_CREDENTIALS");
    }
    return this.buildAuthResponse(user.id, user.tenant_id, user.email, user.role, user.tenant?.name ?? null, user.tenant?.plan ?? null, user.tenant?.status ?? null);
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    const payload = this.verifyToken(refreshToken, env.REFRESH_TOKEN_SECRET);
    const user = await authRepository.findById(payload.sub);
    if (!user) {
      throw ApiError.unauthorized("Invalid refresh token", "INVALID_REFRESH_TOKEN");
    }
    return this.buildAuthResponse(user.id, user.tenant_id, user.email, user.role, user.tenant?.name ?? null, user.tenant?.plan ?? null, user.tenant?.status ?? null);
  }

  verifyAccessToken(token: string): TokenPayload {
    return this.verifyToken(token, env.JWT_SECRET);
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

  private issueTokens(userId: number, tenantId: number, role?: string | null): AuthTokens {
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
    const refreshToken = jwt.sign(claims, refreshSecret, refreshOptions);
    return { accessToken, refreshToken };
  }

  private buildAuthResponse(
    userId: number,
    tenantId: number,
    email: string,
    role: string | null | undefined,
    tenantName: string | null,
    tenantPlan: string | null,
    tenantStatus: string | null,
  ): AuthResponse {
    const tokens = this.issueTokens(userId, tenantId, role);
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
