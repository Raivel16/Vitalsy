import { describe, expect, it } from "vitest";
import { capabilitiesFor } from "./access";

describe("permisos de la pantalla de camas (ISO/IEC 27001: mínimo privilegio)", () => {
  it("gestión de camas solicita y asigna, pero no proyecta altas", () => {
    expect(capabilitiesFor("gestion_camas")).toMatchObject({
      canRequest: true, canAssign: true, canProject: false, seesNotifications: false, seesProjections: true,
    });
  });

  it("la supervisora proyecta y confirma, pero no solicita ni asigna", () => {
    expect(capabilitiesFor("enfermera_supervisora")).toMatchObject({
      canRequest: false, canAssign: false, canProject: true, seesNotifications: true, seesWaitingList: true,
    });
  });

  it.each(["servicios_generales", "auxiliar_enfermeria", "admision", "enfermera_piso"])("%s no tiene acciones en el censo", (role) => {
    const caps = capabilitiesFor(role);
    expect(Object.values(caps).every((value) => value === false)).toBe(true);
  });
});
