"use client";

import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from "react";
import { api, tokenStore } from "./api";

export type Role = "PASSENGER" | "DRIVER";
export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  registerPassenger: (name: string, email: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

// /auth/me may return the user directly or wrapped in { user }, accept both.
async function fetchMe(): Promise<User> {
  const raw = await api<User & { user?: User }>("/auth/me");
  return raw.user ?? raw;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tokenStore.get()) {
      setLoading(false);
      return;
    }
    fetchMe()
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<{ token: string; user: User }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    tokenStore.set(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  // Sign-up is passenger-only. Drivers need a vehicle, which only the seed creates in this MVP.
  const registerPassenger = useCallback(async (name: string, email: string, password: string) => {
    const res = await api<{ token: string; user: User }>("/auth/register", {
      method: "POST",
      body: { name, email, password, role: "PASSENGER" },
    });
    tokenStore.set(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, registerPassenger, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}