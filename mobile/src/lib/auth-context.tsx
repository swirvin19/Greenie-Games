import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiFetch, clearToken, getToken, setToken } from "./api";

export interface SessionUser {
  id: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
}

interface AuthContextValue {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (displayName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => {},
  signup: async () => {},
  logout: async () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await apiFetch<{ user: SessionUser | null }>("/api/auth/me");
      setUser(data.user);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await apiFetch<SessionUser & { token: string }>("/api/auth/login", {
        json: { email, password },
      });
      await setToken(data.token);
      await refresh();
    },
    [refresh]
  );

  const signup = useCallback(
    async (displayName: string, email: string, password: string) => {
      const data = await apiFetch<SessionUser & { token: string }>("/api/auth/signup", {
        json: { displayName, email, password },
      });
      await setToken(data.token);
      await refresh();
    },
    [refresh]
  );

  const logout = useCallback(async () => {
    await clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
