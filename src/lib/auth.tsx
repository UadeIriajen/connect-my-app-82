import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { apiClient, getToken, getUser, setToken, setUser, type StoredUser } from "./api";

interface AuthCtx {
  user: StoredUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => void;
}

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<StoredUser | null>(null);
  const [token, setTokenState] = useState<string | null>(null);

  useEffect(() => {
    setUserState(getUser());
    setTokenState(getToken());
  }, []);

  const refresh = useCallback(() => {
    setUserState(getUser());
    setTokenState(getToken());
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiClient.login({ email, password });
    if (res.access_token) setToken(res.access_token);
    const u: StoredUser = {
      id: res.id,
      username: res.username,
      email: res.email,
      created_at: res.created_at,
      is_banned: res.is_banned,
    };
    setUser(u);
    setUserState(u);
    setTokenState(res.access_token ?? null);
  }, []);

  const signup = useCallback(async (username: string, email: string, password: string) => {
    const res = await apiClient.signup({ username, email, password });
    if (res.access_token) setToken(res.access_token);
    const u: StoredUser = {
      id: res.id,
      username: res.username,
      email: res.email,
      created_at: res.created_at,
      is_banned: res.is_banned,
    };
    setUser(u);
    setUserState(u);
    setTokenState(res.access_token ?? null);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.logout();
    } catch {
      // ignore network errors on logout
    }
    setToken(null);
    setUser(null);
    setUserState(null);
    setTokenState(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        login,
        signup,
        logout,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}