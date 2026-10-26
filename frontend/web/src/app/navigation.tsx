import {
  IconUserPlus,
  IconUsers,
  IconLayoutDashboard,
  IconStethoscope,
  IconFlask,
  IconPhoto,
  IconNotes,
  IconPill,
  IconHeartbeat,
  IconClipboardList,
  IconClockHour4,
  IconNurse,
  IconNotebook,
  IconBellRinging,
  IconActivityHeartbeat,
  IconDoorExit,
  IconBed,
  IconSparkles,
  IconCalendarEvent,
  IconUserCog,
  type Icon,
} from "@tabler/icons-react";
import { ROLES, type Role } from "./roles";
import { safeNextPath } from "../shared/navigation/returnTo";

export type NavItem = {
  to: string;
  label: string;
  icon: Icon;
  roles: Role[];
  end?: boolean;
  /** Si true, reutiliza el último paciente abierto (`vitalsy-ingreso`) al navegar. */
  needsIngreso?: boolean;
};

export type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

const CLINICAL: Role[] = ["enfermera_piso", "auxiliar_enfermeria", "medico_residente", "medico_tratante"];
const CLINICAL_SET: ReadonlySet<Role> = new Set<Role>(CLINICAL);

/** Perfiles que intervienen en el proceso 3 de gestión de alertas. */
export const ALERT_ROLES: Role[] = [
  "enfermera_piso",
  "auxiliar_enfermeria",
  "enfermera_supervisora",
  "medico_residente",
  "medico_tratante",
  "equipo_respuesta_rapida",
];

/** Perfiles del proceso 4 de alta y egreso. */
export const BED_ROLES: Role[] = ["gestion_camas", "enfermera_supervisora"];
export const CLEANING_ROLES: Role[] = ["servicios_generales", "auxiliar_enfermeria", "enfermera_supervisora"];
/** RF-101–104: administración de cuentas y accesos. */
export const ADMIN_ROLES: Role[] = ["administrador_accesos"];
export const STAFF_ROLES: Role[] = ["jefatura_enfermeria", "enfermera_supervisora", "enfermera_piso", "recursos_humanos"];

export const DISCHARGE_ROLES: Role[] = [
  "medico_residente",
  "medico_tratante",
  "trabajo_social",
  "enfermera_piso",
  "altas_caja",
  "camillero",
];

/** Perfiles que trabajan sobre el censo de pacientes en curso. */
export const PATIENT_WORKLIST: Role[] = [
  "admision",
  "camillero",
  ...CLINICAL,
  "enfermera_supervisora",
  "equipo_respuesta_rapida",
  "trabajo_social",
  "altas_caja",
];

export const NAV: NavGroup[] = [
  {
    id: "trabajo",
    label: "Trabajo del turno",
    items: [
      { to: "/", label: "Inicio", icon: IconLayoutDashboard, roles: [...ROLES], end: true },
      { to: "/pacientes", label: "Pacientes", icon: IconUsers, roles: PATIENT_WORKLIST },
      { to: "/pacientes/nuevo", label: "Registrar ingreso", icon: IconUserPlus, roles: ["admision"] },
    ],
  },
  {
    id: "atencion",
    label: "Atención en piso",
    items: [
      { to: "/atencion/chart", label: "Expediente clínico", icon: IconNotebook, roles: [...CLINICAL], needsIngreso: true },
      { to: "/atencion/visita", label: "Visita médica", icon: IconStethoscope, roles: ["medico_residente", "medico_tratante"], needsIngreso: true },
      { to: "/atencion/laboratorio", label: "Laboratorio", icon: IconFlask, roles: ["medico_residente", "medico_tratante", "enfermera_piso"], needsIngreso: true },
      { to: "/atencion/imagenes", label: "Imágenes", icon: IconPhoto, roles: ["medico_residente", "medico_tratante", "enfermera_piso"], needsIngreso: true },
      { to: "/atencion/evolucion", label: "Evolución médica", icon: IconNotes, roles: ["medico_residente", "medico_tratante"], needsIngreso: true },
      { to: "/atencion/cpoe", label: "CPOE", icon: IconPill, roles: ["medico_tratante"], needsIngreso: true },
      { to: "/atencion/constantes", label: "Constantes", icon: IconHeartbeat, roles: ["enfermera_piso", "auxiliar_enfermeria"], needsIngreso: true },
      { to: "/atencion/controles", label: "Controles", icon: IconClockHour4, roles: ["enfermera_piso", "auxiliar_enfermeria", "enfermera_supervisora"] },
      { to: "/atencion/emar", label: "e-MAR", icon: IconClipboardList, roles: ["enfermera_piso"], needsIngreso: true },
      { to: "/atencion/cuidados", label: "Cuidados", icon: IconNurse, roles: ["enfermera_piso", "auxiliar_enfermeria"], needsIngreso: true },
    ],
  },
  {
    id: "alertas",
    label: "Alertas clínicas",
    items: [
      { to: "/alertas", label: "Alertas", icon: IconBellRinging, roles: ALERT_ROLES, end: true },
      {
        to: "/alertas/deterioro",
        label: "Registrar deterioro",
        icon: IconActivityHeartbeat,
        roles: ["auxiliar_enfermeria", "enfermera_piso", "enfermera_supervisora"],
        needsIngreso: true,
      },
    ],
  },
  {
    id: "egreso",
    label: "Alta y egreso",
    items: [
      { to: "/egreso", label: "Egreso", icon: IconDoorExit, roles: DISCHARGE_ROLES, end: true },
    ],
  },
  {
    id: "camas",
    label: "Camas",
    items: [
      { to: "/camas", label: "Censo de camas", icon: IconBed, roles: BED_ROLES, end: true },
      { to: "/camas/limpieza", label: "Limpieza", icon: IconSparkles, roles: CLEANING_ROLES },
    ],
  },
  {
    id: "personal",
    label: "Personal",
    items: [
      { to: "/personal", label: "Turnos y cobertura", icon: IconCalendarEvent, roles: STAFF_ROLES, end: true },
    ],
  },
  {
    id: "administracion",
    label: "Administración",
    items: [
      { to: "/usuarios", label: "Usuarios", icon: IconUserCog, roles: ADMIN_ROLES },
      { to: "/infraestructura", label: "Infraestructura de camas", icon: IconBed, roles: ADMIN_ROLES },
    ],
  },
];

export function navFor(role: Role): NavGroup[] {
  return NAV
    .map((group) => ({ ...group, items: group.items.filter((item) => item.roles.includes(role)) }))
    .filter((group) => group.items.length > 0);
}

/** Conserva el paciente abierto al cambiar de pantalla de atención. */
export function withIngreso(path: string): string {
  const id = sessionStorage.getItem("vitalsy-ingreso");
  if (!id || path.includes("ingreso=")) return path;
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}ingreso=${encodeURIComponent(id)}`;
}

export function isClinicalRole(role: Role): boolean {
  return CLINICAL_SET.has(role);
}

export function canOpenPatientWorklist(role: Role): boolean {
  return PATIENT_WORKLIST.includes(role);
}

export function isAlertRole(role: Role): boolean {
  return ALERT_ROLES.includes(role);
}

export function isDischargeRole(role: Role): boolean {
  return DISCHARGE_ROLES.includes(role);
}

export function isBedRole(role: Role): boolean {
  return BED_ROLES.includes(role) || CLEANING_ROLES.includes(role);
}

export function isAdminRole(role: Role): boolean {
  return ADMIN_ROLES.includes(role);
}

export function isStaffRole(role: Role): boolean {
  return STAFF_ROLES.includes(role);
}

function attentionBasePath(role: Role): string {
  if (role === "medico_tratante" || role === "medico_residente") return "/atencion/chart";
  if (role === "auxiliar_enfermeria") return "/atencion/constantes";
  if (role === "enfermera_piso") return "/atencion/emar";
  return "/pacientes";
}

export function primaryAttentionPath(role: Role, encounterId: string, next?: string | null): string {
  const safeNext = safeNextPath(next);
  if (safeNext) {
    const sep = safeNext.includes("?") ? "&" : "?";
    return `${safeNext}${sep}ingreso=${encodeURIComponent(encounterId)}`;
  }
  return `${attentionBasePath(role)}?ingreso=${encodeURIComponent(encounterId)}`;
}
