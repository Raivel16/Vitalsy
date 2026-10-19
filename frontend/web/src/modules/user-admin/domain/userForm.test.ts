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

  it("valida el formato del correo sin aceptar puntos consecutivos ni espacios", () => {
    const invalid = "Ingrese un correo válido.";
    for (const email of ["ana", "@vitalsy.local", "ana@vitalsy", "ana@vitalsy.", "a@b..c", "a na@vitalsy.local"]) {
      expect(validateUserForm({ name: "Ana", email, role: "camillero" }).email).toBe(invalid);
    }
    for (const email of ["ana@vitalsy.local", "ana.perez+turno@sub.vitalsy.com.pe"]) {
      expect(validateUserForm({ name: "Ana", email, role: "camillero" }).email).toBeUndefined();
    }
  });

  it("resuelve rápido un correo muy largo y mal formado", () => {
    const started = performance.now();
    expect(validateUserForm({ name: "Ana", email: `a@${"b.".repeat(20000)}`, role: "camillero" }).email).toBe("Ingrese un correo válido.");
    expect(performance.now() - started).toBeLessThan(1000);
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
