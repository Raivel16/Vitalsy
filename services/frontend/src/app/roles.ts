export const ROLES = ["admision", "enfermeria", "celador", "medico"] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  admision: "Admisión",
  enfermeria: "Enfermería",
  celador: "Celador",
  medico: "Médico",
};

export type SessionUser = {
  name: string;
  email: string;
  role: Role;
};

