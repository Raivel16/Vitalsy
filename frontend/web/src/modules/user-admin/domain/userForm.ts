import { ROLES, type Role } from "../../../app/roles";

export type UserFormValues = { name: string; email: string; role: string };
export type UserFormErrors = Partial<Record<keyof UserFormValues, string>>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validación previa al envío (RF-102/103); el servidor repite las reglas. */
export function validateUserForm(values: UserFormValues): UserFormErrors {
  const errors: UserFormErrors = {};
  if (!values.name.trim()) errors.name = "El nombre es obligatorio.";
  const email = values.email.trim();
  if (!email) errors.email = "El correo es obligatorio.";
  else if (!EMAIL.test(email)) errors.email = "Ingrese un correo válido.";
  if (!(ROLES as readonly string[]).includes(values.role)) errors.role = "Seleccione un rol.";
  return errors;
}

export function canManageUsers(role: Role): boolean {
  return role === "administrador_accesos";
}

export function statusLabel(isActive: boolean): string {
  return isActive ? "Activo" : "Inactivo";
}
