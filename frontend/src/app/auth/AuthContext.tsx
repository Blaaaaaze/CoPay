import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api } from "../../shared/api/client";

export type AuthUser = {
  id: string;
  displayName: string;
  lastName?: string;
  fullName?: string;
  login: string;
  email?: string;
  phone?: string;
  inviteCode?: string;
  avatarUrl?: string | null;
  preferredLanguage?: string;
  theme?: string;
  accent?: string;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  setSession: (token: string | null, user: AuthUser | null) => void;
  setUser: (user: AuthUser | null) => void;
  refreshProfile: () => Promise<void>;
  logout: () => void;
};

const KEY = "copay_token";
const KEY_U = "copay_user";

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(KEY));
  const [user, setUserState] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem(KEY_U);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  });

  const setUser = useCallback((u: AuthUser | null) => {
    setUserState(u);
    if (u) localStorage.setItem(KEY_U, JSON.stringify(u));
    else localStorage.removeItem(KEY_U);
  }, []);

  const setSession = useCallback(
    (t: string | null, u: AuthUser | null) => {
      setToken(t);
      setUserState(u);
      if (t) localStorage.setItem(KEY, t);
      else localStorage.removeItem(KEY);
      if (u) localStorage.setItem(KEY_U, JSON.stringify(u));
      else localStorage.removeItem(KEY_U);
    },
    []
  );

  const refreshProfile = useCallback(async () => {
    const t = localStorage.getItem(KEY);
    if (!t) return;
    try {
      const u = await api<AuthUser>("/api/me", { token: t });
      setUser(u);
    } catch {
      setSession(null, null);
    }
  }, [setUser, setSession]);

  useEffect(() => {
    void refreshProfile();
  }, [refreshProfile]);

  const logout = useCallback(() => setSession(null, null), [setSession]);

  const value = useMemo(
    () => ({
      token,
      user,
      setSession,
      setUser,
      refreshProfile,
      logout,
    }),
    [token, user, setSession, setUser, refreshProfile, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
