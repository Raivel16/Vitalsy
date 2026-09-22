export const ROLES = ["admision", "enfermeria", "camillero", "medico"] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  admision: "Admisión",
  enfermeria: "Enfermería",
  camillero: "Celador / Camillero",
  medico: "Médico",
};

export type SessionUser = {
  name: string;
  email: string;
  role: Role;
};

