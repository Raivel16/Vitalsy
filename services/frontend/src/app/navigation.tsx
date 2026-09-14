import {
  IconArrowsExchange,
  IconBarcode,
  IconBed,
  IconClipboardHeart,
  IconDoorEnter,
  IconFileSearch,
  IconFolder,
  IconHeartbeat,
  IconId,
  IconLayoutDashboard,
  IconNotes,
  IconPill,
  IconScale,
  IconShare3,
  IconShieldCheck,
  IconSignature,
  IconStethoscope,
  IconUserCheck,
  IconUsers,
  type Icon,
} from "@tabler/icons-react";
import { ROLES, type Role } from "./roles";

export type NavItem = {
  to: string;
  label: string;
  icon: Icon;
  roles: Role[];
  end?: boolean;
  alternate?: boolean;
};

export type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

export const NAV: NavGroup[] = [
  {
    id: "trabajo",
    label: "Trabajo del turno",
    items: [
      { to: "/", label: "Inicio", icon: IconLayoutDashboard, roles: [...ROLES], end: true },
      { to: "/pacientes", label: "Pacientes", icon: IconUsers, roles: [...ROLES] },
    ],
  },
  {
    id: "1.1",
    label: "1.1 Registro administrativo",
    items: [
      { to: "/admision/orden", label: "Orden de internamiento", icon: IconFileSearch, roles: ["admision"] },
      { to: "/admision/filiacion", label: "Filiación", icon: IconId, roles: ["admision"] },
      { to: "/admision/cobertura", label: "Cobertura", icon: IconShieldCheck, roles: ["admision"] },
      { to: "/admision/cobertura/derivacion", label: "Derivación", icon: IconShare3, roles: ["admision"], alternate: true },
      { to: "/admision/brazalete", label: "Brazalete", icon: IconBarcode, roles: ["admision"] },
      { to: "/admision/expediente", label: "Expediente", icon: IconFolder, roles: ["admision"] },
      { to: "/admision/consentimiento", label: "Consentimiento", icon: IconSignature, roles: ["admision"] },
    ],
  },
  {
    id: "1.2",
    label: "1.2 Traslado y recepción",
    items: [
      { to: "/traslado/orden", label: "Orden de traslado", icon: IconBed, roles: ["celador"] },
      { to: "/traslado/identidad", label: "Identidad", icon: IconUserCheck, roles: ["celador"] },
      { to: "/piso/recepcion", label: "Recepción en piso", icon: IconDoorEnter, roles: ["enfermeria"] },
      { to: "/piso/reubicacion", label: "Reubicar paciente", icon: IconArrowsExchange, roles: ["enfermeria"], alternate: true },
    ],
  },
  {
    id: "1.3",
    label: "1.3 Valoración y conciliación",
    items: [
      { to: "/enfermeria/valoracion", label: "Valoración", icon: IconStethoscope, roles: ["enfermeria"] },
      { to: "/enfermeria/constantes", label: "Constantes", icon: IconHeartbeat, roles: ["enfermeria"] },
      { to: "/enfermeria/conciliacion", label: "Conciliación", icon: IconPill, roles: ["enfermeria"] },
      { to: "/enfermeria/riesgos", label: "Escalas de riesgo", icon: IconScale, roles: ["enfermeria"] },
      { to: "/enfermeria/kardex", label: "Kardex", icon: IconClipboardHeart, roles: ["enfermeria"] },
      { to: "/medico/indicaciones", label: "Indicaciones médicas", icon: IconNotes, roles: ["medico"] },
    ],
  },
];

export function navFor(role: Role): NavGroup[] {
  return NAV
    .map((group) => ({ ...group, items: group.items.filter((item) => item.roles.includes(role)) }))
    .filter((group) => group.items.length > 0);
}
