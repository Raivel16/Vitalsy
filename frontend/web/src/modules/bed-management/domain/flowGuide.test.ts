import { describe, expect, it } from "vitest";
import { elapsedLabel, guideFor, PROCESS_STEPS } from "./flowGuide";

const none = { waiting: 0, notifications: 0, pendingDisinfect: 0, toEquip: 0, toEnable: 0 };

describe("guía del proceso de camas", () => {
  it("describe el circuito completo en orden", () => {
    expect(PROCESS_STEPS.map((step) => step.id)).toEqual([
      "solicitud", "asignacion", "egreso", "desinfeccion", "equipamiento", "habilitacion",
    ]);
  });

  it("indica a gestión de camas qué hacer según la lista de espera", () => {
    expect(guideFor("gestion_camas", { ...none, waiting: 3 }).headline).toMatch(/3 solicitudes en espera/i);
    expect(guideFor("gestion_camas", none).headline).toMatch(/registre una solicitud/i);
  });

  it("prioriza a la supervisora: habilitar, luego confirmar asignaciones, luego proyectar", () => {
    expect(guideFor("enfermera_supervisora", { ...none, toEnable: 1, notifications: 2 }).headline).toMatch(/habilitar/i);
    expect(guideFor("enfermera_supervisora", { ...none, notifications: 2 }).headline).toMatch(/2 asignaciones/i);
    expect(guideFor("enfermera_supervisora", none).headline).toMatch(/proyecci/i);
  });

  it("orienta a limpieza y a la auxiliar según su cola", () => {
    expect(guideFor("servicios_generales", { ...none, pendingDisinfect: 1 }).headline).toMatch(/1 desinfección pendiente/i);
    expect(guideFor("servicios_generales", none).detail).toMatch(/egreso/i);
    expect(guideFor("auxiliar_enfermeria", { ...none, toEquip: 2 }).headline).toMatch(/2 unidades por equipar/i);
  });

  it("formatea el tiempo transcurrido", () => {
    const now = new Date("2026-10-09T12:00:00Z").getTime();
    expect(elapsedLabel("2026-10-09T11:59:40Z", now)).toBe("Hace instantes");
    expect(elapsedLabel("2026-10-09T11:46:00Z", now)).toBe("Hace 14 min");
    expect(elapsedLabel("2026-10-09T09:00:00Z", now)).toBe("Hace 3 h");
    expect(elapsedLabel("2026-10-07T12:00:00Z", now)).toBe("Hace 2 d");
    expect(elapsedLabel(null, now)).toBe("—");
  });
});
