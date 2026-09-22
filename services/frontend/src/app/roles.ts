export const ROLES = [
  "admision",
  "camillero",
  "enfermera_piso",
  "auxiliar_enfermeria",
  "medico_residente",
  "medico_tratante",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  admision: "Admisión",
  camillero: "Celador / Camillero",
  enfermera_piso: "Enfermera de piso",
  auxiliar_enfermeria: "Auxiliar de enfermería",
  medico_residente: "Médico residente",
  medico_tratante: "Médico tratante",
};

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export type SessionUser = {
  name: string;
  email: string;
  role: Role;
};
