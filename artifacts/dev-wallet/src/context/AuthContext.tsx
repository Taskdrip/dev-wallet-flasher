import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export interface AuthUser {
  id: number;
  username: string;
  email: string | null;
  phone: string | null;
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  signIn: (identifier: string, password: string) => Promise<AuthUser>;
  signUp: (input: { username: string; email?: string; phone?: string; password: string }) => Promise<AuthUser>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);
const API_BASE = `${import.meta.env.BASE_URL.replace(/\/$/, "")}/api`;

async function requestAuth<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error ?? `Request failed (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    requestAuth<{ user: AuthUser }>("/auth/me")
      .then((result) => {
        if (active) setUser(result.user);
      })
      .catch((reason: unknown) => {
        if (active) {
          if (reason instanceof Error && !reason.message.includes("401")) setError(reason.message);
          setUser(null);
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(async (identifier: string, password: string) => {
    setError(null);
    const result = await requestAuth<{ user: AuthUser }>("/auth/signin", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    });
    setUser(result.user);
    return result.user;
  }, []);

  const signUp = useCallback(async (input: { username: string; email?: string; phone?: string; password: string }) => {
    setError(null);
    const result = await requestAuth<{ user: AuthUser }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(input),
    });
    setUser(result.user);
    return result.user;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await requestAuth<{ success: boolean }>("/auth/signout", { method: "POST" });
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({ user, isLoading, error, signIn, signUp, signOut }), [
    user, isLoading, error, signIn, signUp, signOut,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used within AuthProvider");
  return value;
}
