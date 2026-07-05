'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { User } from '@/lib/types';
import { auth } from '@/lib/api';
import { getToken, setToken as saveToken, removeToken } from '@/lib/api';

// ── Context Shape ───────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOnboarded: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, email?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ── Provider ────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && !!token;
  const isOnboarded = user?.is_onboarded ?? false;

  // Validate existing token on mount
  useEffect(() => {
    const existingToken = getToken();
    if (existingToken) {
      setTokenState(existingToken);
      auth
        .me()
        .then((u) => {
          setUser(u);
        })
        .catch(() => {
          removeToken();
          setTokenState(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const res = await auth.login({ username, password });
    saveToken(res.access_token);
    setTokenState(res.access_token);
    setUser(res.user);
  }, []);

  const register = useCallback(
    async (username: string, password: string, email?: string) => {
      const res = await auth.register({ username, password, email });
      saveToken(res.access_token);
      setTokenState(res.access_token);
      setUser(res.user);
    },
    [],
  );

  const logout = useCallback(() => {
    removeToken();
    setUser(null);
    setTokenState(null);
    window.location.href = '/login';
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const u = await auth.me();
      setUser(u);
    } catch {
      // silent
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated,
        isOnboarded,
        login,
        register,
        logout,
        refreshUser,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
