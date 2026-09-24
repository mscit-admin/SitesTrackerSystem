"use client";

import { createContext, useContext } from "react";
import { permGranted } from "@/lib/permissions";

export interface ClientUser {
  id: string;
  fullName: string;
  employeeId: string;
  email: string;
  avatarUrl: string | null;
  roleName: string | null;
  isAdmin: boolean;
  permissions: string[];
  twoFactorEnabled: boolean;
  mustChangePassword: boolean;
}

const AuthCtx = createContext<{ user: ClientUser | null }>({ user: null });

export function AuthProvider({ user, children }: { user: ClientUser | null; children: React.ReactNode }) {
  return <AuthCtx.Provider value={{ user }}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const { user } = useContext(AuthCtx);
  const can = (key: string) => !!user && (user.isAdmin || permGranted(user.permissions, key));
  return { user, can };
}
