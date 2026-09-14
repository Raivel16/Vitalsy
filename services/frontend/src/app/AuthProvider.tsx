import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "./api";
import { ROLE_LABEL, type Role, type SessionUser } from "./roles";

type AuthState = {
  user: SessionUser | null;
  ready: boolean;
  notice: string;
  setUser: (user: SessionUser | null) => void;
  setNotice: (notice: string) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

function testUser(): SessionUser | null {
  const stored = sessionStorage.getItem("vitalsy-user");
  if (stored) return JSON.parse(stored) as SessionUser;
  const role = sessionStorage.getItem("vitalsy-role");
  if (role === "admision" || role === "enfermeria" || role === "celador" || role === "medico") {
    return { name: ROLE_LABEL[role as Role], email: `${role}@vitalsy.local`, role };
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (import.meta.env.MODE === "test") {
      setUser(testUser());
      setReady(true);
      return;
    }

    let active = true;
    api<{ user: SessionUser }>("/api/v1/auth/me")
      .then((data) => {
        if (active) setUser(data.user);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<AuthState>(() => ({
    user,
    ready,
    notice,
    setUser,
    setNotice,
    logout: async () => {
      try {
        await api("/api/v1/auth/logout", { method: "POST" });
      } catch {
        // La sesión local se cierra aunque el servidor no responda.
      }
      setNotice("");
      setUser(null);
    },
  }), [notice, ready, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth debe usarse dentro de AuthProvider.");
  return value;
}
