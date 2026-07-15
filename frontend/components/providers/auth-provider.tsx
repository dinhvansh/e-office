'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type AuthUser = {
  id: number;
  email: string;
  role?: string | null;
  full_name?: string | null;
  phone?: string | null;
};

type UserPermission = {
  id?: number;
  resource: string;
  action: string;
  description?: string | null;
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
  permissions: string[];
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string | string[]) => boolean;
  fetchJson: <T>(path: string, init?: RequestInit) => Promise<T>;
};

import { getApiBaseUrl } from '@/lib/env';

const STORAGE_KEY = 'esign.auth';
const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type StoredSession = {
  user?: AuthUser;
  tenant?: TenantProfile;
  tokens?: Tokens;
  permissions?: string[];
};

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: string | { message?: string };
};

const getLocalizedLoginError = (code?: string): string => {
  if (code === 'ACCOUNT_NOT_ACTIVE') return 'Tài khoản của bạn đang chờ được kích hoạt. Vui lòng liên hệ quản trị viên hoặc thử lại sau khi tài khoản được phê duyệt.';
  if (code === 'TENANT_NOT_ACTIVE') return 'Workspace hiện chưa hoạt động. Vui lòng liên hệ quản trị viên của workspace.';
  if (code === 'INVALID_CREDENTIALS') return 'Email hoặc mật khẩu không đúng.';
  return 'Không thể đăng nhập lúc này. Vui lòng thử lại sau.';
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
    permissions: session.permissions ?? [],
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safeSession));
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [tokens, setTokens] = useState<Tokens | undefined>();
  const [user, setUser] = useState<AuthUser | undefined>();
  const [tenant, setTenant] = useState<TenantProfile | undefined>();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void Promise.resolve().then(() => {
      const stored = readStoredSession();
      if (stored?.tokens) {
        setTokens(stored.tokens);
        setUser(stored.user);
        setTenant(stored.tenant);
        setPermissions(stored.permissions ?? []);
      }
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    writeStoredSession({ tokens, user, tenant, permissions });
  }, [tokens, user, tenant, permissions]);

  const fetchPermissions = useCallback(async (accessToken?: string) => {
    if (!accessToken) {
      setPermissions([]);
      return;
    }

    try {
      const apiBaseUrl = getApiBaseUrl();
      const res = await fetch(`${apiBaseUrl}/roles/my-permissions`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        setPermissions([]);
        return;
      }

      const payload = await res.json();
      const items = (payload?.data ?? []) as UserPermission[];
      setPermissions(items.map((item) => `${item.resource}:${item.action}`));
    } catch {
      setPermissions([]);
    }
  }, []);

  useEffect(() => {
    if (!tokens?.accessToken) {
      return;
    }

    if (permissions.length > 0) {
      return;
    }

    void Promise.resolve().then(() => fetchPermissions(tokens.accessToken));
  }, [fetchPermissions, permissions.length, tokens?.accessToken]);

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
      const errorCode = typeof payload.error === 'object' ? payload.error?.code : undefined;
      if (res.status === 401 || res.status === 403) {
        throw new Error(getLocalizedLoginError(errorCode));
      }
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
    await fetchPermissions(payload.data.tokens?.accessToken);
  }, [fetchPermissions]);

  const logout = useCallback(() => {
    const apiBaseUrl = getApiBaseUrl();
    fetch(`${apiBaseUrl}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => undefined);
    setTokens(undefined);
    setUser(undefined);
    setTenant(undefined);
    setPermissions([]);
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
      await fetchPermissions(payload.data.tokens?.accessToken);
      return true;
    } catch (error) {
      // Only logout if it's an auth error, not network error
      if (error instanceof Error && !error.message.includes('fetch')) {
        logout();
      }
      return false;
    }
  }, [fetchPermissions, logout]);

  const hasPermission = useCallback(
    (permission: string | string[]) => {
      const required = Array.isArray(permission) ? permission : [permission];
      if (user?.role === 'super_admin') {
        return true;
      }
      return required.every((item) => permissions.includes(item));
    },
    [permissions, user?.role],
  );

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
      permissions,
      isLoading,
      login: performLogin,
      logout,
      hasPermission,
      fetchJson,
    }),
    [fetchJson, hasPermission, isLoading, logout, performLogin, permissions, tenant, tokens, user],
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
