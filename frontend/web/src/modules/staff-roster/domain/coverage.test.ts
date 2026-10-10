import { capabilitiesFor } from "./capabilities";
import { coverageStatus, loadLevel, nextDayShift, shiftWindow } from "./coverage";

describe("estados de cobertura (RF-86/87/88)", () => {
  it("traduce cada estado a una etiqueta de proceso y un tono", () => {
    expect(coverageStatus("solicitada")).toEqual({ label: "Pendiente de jefatura", tone: "warning" });
    expect(coverageStatus("aprobada_jefatura")).toEqual({ label: "Pendiente de RRHH", tone: "info" });
    expect(coverageStatus("autorizada")).toEqual({ label: "Lista para ingreso", tone: "success" });
    expect(coverageStatus("confirmada")).toEqual({ label: "Retén en piso", tone: "neutral" });
  });

  it("no expone un estado desconocido en crudo", () => {
    expect(coverageStatus("xyz").label).toBe("Estado no reconocido");
  });
});

describe("carga clínica por enfermera (RF-79)", () => {
  it("clasifica la carga NEWS2 acumulada por umbrales", () => {
    expect(loadLevel(0).label).toBe("Holgada");
    expect(loadLevel(5).label).toBe("Óptima");
    expect(loadLevel(12).label).toBe("Sobrecarga");
  });

  it("usa danger solo en sobrecarga", () => {
    expect(loadLevel(12).tone).toBe("danger");
    expect(loadLevel(5).tone).toBe("success");
  });
});

describe("turnos", () => {
  it("define la ventana horaria de día y noche", () => {
    expect(shiftWindow("2026-10-09", "dia")).toEqual({ startsAt: "2026-10-09T07:00:00", endsAt: "2026-10-09T19:00:00" });
    expect(shiftWindow("2026-10-09", "noche")).toEqual({ startsAt: "2026-10-09T19:00:00", endsAt: "2026-10-10T07:00:00" });
  });

  it("calcula el día siguiente sin saltos de mes erróneos", () => {
    expect(nextDayShift("2026-10-31")).toBe("2026-11-01");
  });
});

describe("capacidades por rol", () => {
  it("separa lo que hace cada perfil de personal", () => {
    expect(capabilitiesFor("jefatura_enfermeria")).toMatchObject({ publishRoster: true, approveCoverage: true, assign: false });
    expect(capabilitiesFor("enfermera_supervisora")).toMatchObject({ assign: true, recordAbsence: true, confirmRetainer: true, approveCoverage: false });
    expect(capabilitiesFor("recursos_humanos")).toMatchObject({ authorizeCoverage: true, publishRoster: false });
    expect(capabilitiesFor("enfermera_piso")).toMatchObject({ handover: true, viewCoverage: false });
  });

  it("no otorga capacidades a perfiles ajenos", () => {
    expect(capabilitiesFor("admision")).toEqual({
      publishRoster: false, assign: false, recordAbsence: false, handover: false,
      viewCoverage: false, approveCoverage: false, authorizeCoverage: false, confirmRetainer: false,
    });
  });
});
