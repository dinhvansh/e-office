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
    full_name?: string | null;
    phone?: string | null;
    avatar_url?: string | null;
    signature_image_url?: string | null;
    signature_type?: string | null;
    signature_updated_at?: Date | null;
  };
  tenant: {
    id: number;
    name: string | null;
    plan: string | null;
    status: string | null;
  };
}
