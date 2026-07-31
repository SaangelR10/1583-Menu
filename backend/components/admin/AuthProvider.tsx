"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { apiFetch, getSession, setSession, refreshSession, logoutSession, ApiError } from "@/lib/client/apiClient";

type AdminInfo = { id: string; email: string };

type AuthContextValue = {
  admin: AdminInfo | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ twoFactorRequired: boolean; challengeToken?: string }>;
  verifyTwoFactor: (challengeToken: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const result = await refreshSession();
      setAdmin(result?.admin ?? null);
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch<{
      twoFactorRequired: boolean;
      challengeToken?: string;
      accessToken?: string;
      csrfToken?: string;
      admin?: AdminInfo;
    }>("/api/v1/admin/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });

    if (!res.twoFactorRequired && res.accessToken && res.csrfToken && res.admin) {
      setSession({ accessToken: res.accessToken, csrfToken: res.csrfToken, admin: res.admin });
      setAdmin(res.admin);
    }
    return { twoFactorRequired: res.twoFactorRequired, challengeToken: res.challengeToken };
  }, []);

  const verifyTwoFactor = useCallback(async (challengeToken: string, code: string) => {
    const res = await apiFetch<{ accessToken: string; csrfToken: string; admin: AdminInfo }>(
      "/api/v1/admin/auth/2fa/login",
      { method: "POST", body: JSON.stringify({ challengeToken, code }) }
    );
    setSession({ accessToken: res.accessToken, csrfToken: res.csrfToken, admin: res.admin });
    setAdmin(res.admin);
  }, []);

  const logout = useCallback(async () => {
    await logoutSession();
    setAdmin(null);
  }, []);

  return (
    <AuthContext.Provider value={{ admin, loading, login, verifyTwoFactor, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}

export { getSession, ApiError };
