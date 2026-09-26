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
      "enfermera_supervisora",
      "equipo_respuesta_rapida",
      "trabajo_social",
      "altas_caja",
      "gestion_camas",
      "servicios_generales",
      "jefatura_enfermeria",
      "recursos_humanos",
    ]);
    expect(ROLES).not.toContain("enfermeria");
    expect(ROLES).not.toContain("medico");
  });

  it("incluye los actores de alertas, egreso, camas y personal", () => {
    expect(ROLE_LABEL.enfermera_supervisora).toBe("Enfermera supervisora de piso");
    expect(ROLE_LABEL.equipo_respuesta_rapida).toBe("Equipo de Respuesta Rápida");
    expect(ROLE_LABEL.trabajo_social).toBe("Trabajo social");
    expect(ROLE_LABEL.altas_caja).toBe("Altas / Caja");
    expect(ROLE_LABEL.gestion_camas).toBe("Gestión de camas");
    expect(ROLE_LABEL.servicios_generales).toBe("Servicios generales / Limpieza");
    expect(ROLE_LABEL.jefatura_enfermeria).toBe("Jefatura de enfermería");
    expect(ROLE_LABEL.recursos_humanos).toBe("Recursos humanos");
  });

  it("etiqueta cada rol con el actor del proceso", () => {
    expect(ROLE_LABEL.enfermera_piso).toBe("Enfermera de piso");
    expect(ROLE_LABEL.auxiliar_enfermeria).toBe("Auxiliar de enfermería");
    expect(ROLE_LABEL.medico_residente).toBe("Médico residente");
    expect(ROLE_LABEL.medico_tratante).toBe("Médico tratante");
  });

  it("reconoce solo claves de rol válidas", () => {
    expect(isRole("enfermera_piso")).toBe(true);
    expect(isRole("gestion_camas")).toBe(true);
    expect(isRole("enfermeria")).toBe(false);
    expect(isRole("medico")).toBe(false);
    expect(isRole("limpieza")).toBe(false);
  });
});
