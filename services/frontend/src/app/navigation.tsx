import {
  IconUserPlus,
  IconUsers,
  IconLayoutDashboard,
  type Icon,
} from "@tabler/icons-react";
import { ROLES, type Role } from "./roles";

export type NavItem = {
  to: string;
  label: string;
  icon: Icon;
  roles: Role[];
  end?: boolean;
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
      { to: "/pacientes/nuevo", label: "Registrar ingreso", icon: IconUserPlus, roles: ["admision"] },
    ],
  },
];

export function navFor(role: Role): NavGroup[] {
  return NAV
    .map((group) => ({ ...group, items: group.items.filter((item) => item.roles.includes(role)) }))
    .filter((group) => group.items.length > 0);
}
