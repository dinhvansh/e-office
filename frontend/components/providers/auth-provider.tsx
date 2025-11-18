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
  plan: string | null;
  status: string | null;
  created_at?: string | null;
};

type Tokens = {
  accessToken: string;
  refreshToken: string;
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

const STORAGE_KEY = 'esign.auth';
const DEFAULT_API_URL = 'http://localhost:4000/api/v1';
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_URL).trim().replace(/\/+$/, '');

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type StoredSession = {
  user?: AuthUser;
  tenant?: TenantProfile;
  tokens?: Tokens;
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
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
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
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const payload = await res.json();
    if (!payload.success) {
      throw new Error(payload.error?.message ?? 'Đăng nhập thất bại');
    }
    setTokens(payload.data.tokens);
    setUser(payload.data.user);
    setTenant(payload.data.tenant);
  }, []);

  const logout = useCallback(() => {
    setTokens(undefined);
    setUser(undefined);
    setTenant(undefined);
    writeStoredSession(undefined);
  }, []);

  const refreshTokens = useCallback(async () => {
    if (!tokens?.refreshToken) {
      return false;
    }
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: tokens.refreshToken }),
    });
    const payload = await res.json();
    if (!payload.success) {
      logout();
      return false;
    }
    setTokens(payload.data.tokens);
    setUser(payload.data.user);
    setTenant(payload.data.tenant);
    return true;
  }, [logout, tokens?.refreshToken]);

  const fetchJson = useCallback(
    async <T,>(path: string, init?: RequestInit): Promise<T> => {
      const attempt = async (retry = false): Promise<T> => {
        const res = await fetch(`${API_BASE_URL}${path}`, {
          ...init,
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
        }
        const json = await res.json();
        if (!json.success) {
          throw new Error(json.error?.message ?? 'Request failed');
        }
        return json.data as T;
      };
      return attempt();
    },
    [refreshTokens, tokens?.accessToken],
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
