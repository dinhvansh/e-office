'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type AuthUser = {
  id: number;
  email: string;
  role?: string | null;
};

type TenantProfile = {
  id: number;
  name: string | null;
  domain?: string | null;
  plan: string | null;
  status: string | null;
  created_at?: string | null;
};

type Tokens = {
  accessToken: string;
  refreshToken?: string;
};

type AuthContextValue = {
  user?: AuthUser;
  tenant?: TenantProfile;
  tokens?: Tokens;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchJson: <T>(path: string, init?: RequestInit) => Promise<T>;
};

import { getApiBaseUrl } from '@/lib/env';

const STORAGE_KEY = 'esign.auth';
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type StoredSession = {
  user?: AuthUser;
  tenant?: TenantProfile;
  tokens?: Tokens;
};

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: string | { message?: string };
};

const readStoredSession = (): StoredSession | undefined => {
  if (typeof window === 'undefined') {
    return undefined;
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return undefined;
  }
  try {
    return JSON.parse(raw) as StoredSession;
  } catch {
    return undefined;
  }
};

const writeStoredSession = (session?: StoredSession) => {
  if (typeof window === 'undefined') {
    return;
  }
  if (!session) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  const safeSession: StoredSession = {
    user: session.user,
    tenant: session.tenant,
    tokens: session.tokens?.accessToken ? { accessToken: session.tokens.accessToken } : undefined,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safeSession));
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [tokens, setTokens] = useState<Tokens | undefined>();
  const [user, setUser] = useState<AuthUser | undefined>();
  const [tenant, setTenant] = useState<TenantProfile | undefined>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = readStoredSession();
    if (stored?.tokens) {
      setTokens(stored.tokens);
      setUser(stored.user);
      setTenant(stored.tenant);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    writeStoredSession({ tokens, user, tenant });
  }, [tokens, user, tenant]);

  const performLogin = useCallback(async (email: string, password: string) => {
    const apiBaseUrl = getApiBaseUrl();
    const res = await fetch(`${apiBaseUrl}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    const payload = await res.json();
    
    if (!res.ok) {
      // Handle different error cases
      if (res.status === 401) {
        const errorCode = payload.error?.code;
        if (errorCode === 'INVALID_CREDENTIALS') {
          throw new Error('Email hoặc mật khẩu không đúng');
        }
        throw new Error('Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin');
      }
      if (res.status === 400) {
        throw new Error('Thông tin đăng nhập không hợp lệ');
      }
      throw new Error(payload.error?.message ?? 'Đăng nhập thất bại');
    }
    
    if (!payload.success) {
      throw new Error(payload.error?.message ?? 'Đăng nhập thất bại');
    }
    
    setTokens(payload.data.tokens);
    setUser(payload.data.user);
    setTenant(payload.data.tenant);
  }, []);

  const logout = useCallback(() => {
    const apiBaseUrl = getApiBaseUrl();
    fetch(`${apiBaseUrl}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => undefined);
    setTokens(undefined);
    setUser(undefined);
    setTenant(undefined);
    writeStoredSession(undefined);
  }, []);

  const refreshTokens = useCallback(async () => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      const res = await fetch(`${apiBaseUrl}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        logout();
        return false;
      }
      const payload = await res.json();
      if (!payload.success) {
        logout();
        return false;
      }
      setTokens(payload.data.tokens);
      setUser(payload.data.user);
      setTenant(payload.data.tenant);
      return true;
    } catch (error) {
      // Only logout if it's an auth error, not network error
      if (error instanceof Error && !error.message.includes('fetch')) {
        logout();
      }
      return false;
    }
  }, [logout]);

  const fetchJson = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      const attempt = async (retry = false): Promise<T> => {
        const apiBaseUrl = getApiBaseUrl();
        const res = await fetch(`${apiBaseUrl}${path}`, {
          ...init,
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(init?.headers ?? {}),
            ...(tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
          },
        });
        if (res.status === 401 && !retry) {
          const refreshed = await refreshTokens();
          if (refreshed) {
            return attempt(true);
          }
          logout();
          throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        }
        // Handle non-JSON responses
        let json: ApiEnvelope<T> | T;
        try {
          json = await res.json();
        } catch {
          throw new Error(`Request failed with status ${res.status}`);
        }

        const envelope = json as ApiEnvelope<T>;

        if (!res.ok || envelope.success === false) {
          const errorMessage = typeof envelope.error === 'string'
            ? envelope.error
            : envelope.error?.message ?? `Request failed with status ${res.status}`;
          throw new Error(errorMessage);
        }

        if (envelope.data !== undefined) {
          return envelope.data as T;
        }

        // Otherwise return the whole response
        return json as T;
      };
      return attempt();
    },
    [logout, refreshTokens, tokens?.accessToken],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      tenant,
      tokens,
      isLoading,
      login: performLogin,
      logout,
      fetchJson,
    }),
    [fetchJson, isLoading, logout, performLogin, tenant, tokens, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
