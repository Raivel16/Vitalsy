import { ROLES, ROLE_LABEL, isRole } from "./roles";

describe("roles operativos", () => {
  it("separa enfermería y medicina sin roles genéricos mezclados", () => {
    expect(ROLES).toEqual([
      "admision",
      "camillero",
      "enfermera_piso",
      "auxiliar_enfermeria",
      "medico_residente",
      "medico_tratante",
    ]);
    expect(ROLES).not.toContain("enfermeria");
    expect(ROLES).not.toContain("medico");
  });

  it("etiqueta cada rol con el actor del proceso", () => {
    expect(ROLE_LABEL.enfermera_piso).toBe("Enfermera de piso");
    expect(ROLE_LABEL.auxiliar_enfermeria).toBe("Auxiliar de enfermería");
    expect(ROLE_LABEL.medico_residente).toBe("Médico residente");
    expect(ROLE_LABEL.medico_tratante).toBe("Médico tratante");
  });

  it("reconoce solo claves de rol válidas", () => {
    expect(isRole("enfermera_piso")).toBe(true);
    expect(isRole("enfermeria")).toBe(false);
    expect(isRole("medico")).toBe(false);
  });
});
