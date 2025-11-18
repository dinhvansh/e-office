export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface TokenPayload {
  sub: number;
  tenantId: number;
  role?: string | null;
}

export interface AuthResponse {
  tokens: AuthTokens;
  user: {
    id: number;
    email: string;
    role?: string | null;
  };
  tenant: {
    id: number;
    name: string | null;
    plan: string | null;
    status: string | null;
  };
}
