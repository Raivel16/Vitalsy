import { canManageUsers, statusLabel, validateUserForm } from "./userForm";

describe("validación del formulario de usuario (RF-102/103)", () => {
  it("exige nombre, correo con formato y un rol del catálogo", () => {
    expect(validateUserForm({ name: "", email: "", role: "" })).toEqual({
      name: "El nombre es obligatorio.",
      email: "El correo es obligatorio.",
      role: "Seleccione un rol.",
    });
  });

  it("rechaza un correo mal formado y acepta datos completos", () => {
    expect(validateUserForm({ name: "Ana", email: "ana@", role: "camillero" }).email).toBe("Ingrese un correo válido.");
    expect(validateUserForm({ name: "Ana", email: "ana@vitalsy.local", role: "camillero" })).toEqual({});
  });

  it("rechaza un rol fuera del catálogo", () => {
    expect(validateUserForm({ name: "Ana", email: "ana@vitalsy.local", role: "root" }).role).toBe("Seleccione un rol.");
  });
});

describe("permisos de administración de usuarios", () => {
  it("solo el administrador de accesos gestiona cuentas", () => {
    expect(canManageUsers("administrador_accesos")).toBe(true);
    expect(canManageUsers("recursos_humanos")).toBe(false);
    expect(canManageUsers("admision")).toBe(false);
  });

  it("etiqueta el estado de la cuenta", () => {
    expect(statusLabel(true)).toBe("Activo");
    expect(statusLabel(false)).toBe("Inactivo");
  });
});
