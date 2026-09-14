import { useMemo, useState, type ReactNode } from "react";
import { RoleContext } from "./role-context";
import { readStoredRole, type Role } from "./roles";

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(readStoredRole);
  const value = useMemo(
    () => ({
      role,
      setRole: (next: Role) => {
        sessionStorage.setItem("vitalsy-role", next);
        setRoleState(next);
      },
    }),
    [role],
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}
