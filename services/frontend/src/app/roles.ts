export const ROLES = ["admision", "enfermeria", "celador", "medico"] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  admision: "Admisión",
  enfermeria: "Enfermería",
  celador: "Celador",
  medico: "Médico",
};

export function readStoredRole(): Role {
  const stored = sessionStorage.getItem("vitalsy-role");
  if (stored === "admision" || stored === "enfermeria" || stored === "celador" || stored === "medico") {
    return stored;
  }
  return "admision";
}
