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
  IconNurse,
  IconNotebook,
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

export const NAV: NavGroup[] = [
  {
    id: "trabajo",
    label: "Trabajo del turno",
    items: [
      { to: "/", label: "Inicio", icon: IconLayoutDashboard, roles: [...ROLES], end: true },
      { to: "/pacientes", label: "Pacientes", icon: IconUsers, roles: [...ROLES] },
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
      { to: "/atencion/emar", label: "e-MAR", icon: IconClipboardList, roles: ["enfermera_piso"], needsIngreso: true },
      { to: "/atencion/cuidados", label: "Cuidados", icon: IconNurse, roles: ["enfermera_piso", "auxiliar_enfermeria"], needsIngreso: true },
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
  return CLINICAL.includes(role);
}

export function primaryAttentionPath(role: Role, encounterId: string, next?: string | null): string {
  const safeNext = safeNextPath(next);
  if (safeNext) {
    const sep = safeNext.includes("?") ? "&" : "?";
    return `${safeNext}${sep}ingreso=${encodeURIComponent(encounterId)}`;
  }
  const base =
    role === "medico_tratante" || role === "medico_residente"
      ? "/atencion/chart"
      : role === "auxiliar_enfermeria"
        ? "/atencion/constantes"
        : role === "enfermera_piso"
          ? "/atencion/emar"
          : "/pacientes";
  return `${base}?ingreso=${encodeURIComponent(encounterId)}`;
}
