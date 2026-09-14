import { createContext, useContext } from "react";
import type { Role } from "./roles";

export type RoleContextValue = {
  role: Role;
  setRole: (role: Role) => void;
};

export const RoleContext = createContext<RoleContextValue | null>(null);

export function useRole() {
  const value = useContext(RoleContext);
  if (!value) {
    throw new Error("useRole debe usarse dentro de RoleProvider.");
  }
  return value;
}
