import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api } from "./api";
import { bindIdleTimer } from "./idleTimer";
import { ROLE_LABEL, isRole, type SessionUser } from "./roles";

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
  if (role && isRole(role)) {
    return { name: ROLE_LABEL[role], email: `${role}@vitalsy.local`, role };
  }
  return null;
}

export function AuthProvider({ children }: Readonly<{ children: ReactNode }>) {
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

  useEffect(() => {
    if (!user) return undefined;
    return bindIdleTimer(() => {
      setUser(null);
      setNotice("La sesión se cerró por inactividad. Vuelva a iniciar sesión.");
      void api("/api/v1/auth/logout", { method: "POST" }).catch(() => undefined);
    });
  }, [user]);

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
