export const ROLES = [
  "admision",
  "camillero",
  "enfermera_piso",
  "auxiliar_enfermeria",
  "medico_residente",
  "medico_tratante",
  "enfermera_supervisora",
  "equipo_respuesta_rapida",
  "trabajo_social",
  "altas_caja",
  "gestion_camas",
  "servicios_generales",
  "jefatura_enfermeria",
  "recursos_humanos",
  "administrador_accesos",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  admision: "Admisión",
  camillero: "Celador / Camillero",
  enfermera_piso: "Enfermera de piso",
  auxiliar_enfermeria: "Auxiliar de enfermería",
  medico_residente: "Médico residente",
  medico_tratante: "Médico tratante",
  enfermera_supervisora: "Enfermera supervisora de piso",
  equipo_respuesta_rapida: "Equipo de Respuesta Rápida",
  trabajo_social: "Trabajo social",
  altas_caja: "Altas / Caja",
  gestion_camas: "Gestión de camas",
  servicios_generales: "Servicios generales / Limpieza",
  jefatura_enfermeria: "Jefatura de enfermería",
  recursos_humanos: "Recursos humanos",
  administrador_accesos: "Administrador de accesos",
};

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export type SessionUser = {
  /** Id propio; define el canal privado de alertas en tiempo real. */
  id?: number;
  name: string;
  email: string;
  role: Role;
  mustChangePassword?: boolean;
};
