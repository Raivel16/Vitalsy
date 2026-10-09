import { describe, expect, it } from "vitest";
import {
  CHECKLIST_ITEMS,
  actionFor,
  checklistComplete,
  emptyChecklist,
  ownerOf,
  protocolLabel,
  stageCounts,
  statusLabel,
} from "./cleaningStage";

describe("etapas de la orden de limpieza (RF-74 a RF-77)", () => {
  it("cada rol solo recibe la acción de su etapa", () => {
    expect(actionFor("servicios_generales", "pendiente")).toBe("disinfect");
    expect(actionFor("auxiliar_enfermeria", "completada")).toBe("equip");
    expect(actionFor("enfermera_supervisora", "equipada")).toBe("enable");
  });

  it.each([
    ["servicios_generales", "completada"],
    ["servicios_generales", "equipada"],
    ["auxiliar_enfermeria", "pendiente"],
    ["auxiliar_enfermeria", "equipada"],
    ["enfermera_supervisora", "pendiente"],
    ["enfermera_supervisora", "completada"],
    ["enfermera_supervisora", "habilitada"],
    ["gestion_camas", "pendiente"],
  ] as const)("%s no puede actuar sobre una orden %s", (role, status) => {
    expect(actionFor(role, status)).toBeNull();
  });

  it("indica quién debe actuar a continuación", () => {
    expect(ownerOf("pendiente")).toBe("Servicios generales");
    expect(ownerOf("completada")).toBe("Auxiliar de enfermería");
    expect(ownerOf("equipada")).toBe("Enfermera supervisora");
    expect(ownerOf("habilitada")).toBeNull();
  });

  it("traduce estados y protocolos a lenguaje clínico", () => {
    expect(statusLabel("pendiente")).toBe("Sucia / en espera");
    expect(statusLabel("completada")).toBe("Desinfectada");
    expect(statusLabel("equipada")).toBe("Equipada y verificada");
    expect(statusLabel("habilitada")).toBe("Disponible");
    expect(protocolLabel("deep")).toBe("Desinfección profunda / terminal");
    expect(protocolLabel("standard")).toBe("Limpieza estándar");
  });

  it("el checklist exige los cuatro ítems", () => {
    expect(CHECKLIST_ITEMS).toHaveLength(4);
    const checklist = emptyChecklist();
    expect(checklistComplete(checklist)).toBe(false);
    for (const item of CHECKLIST_ITEMS) checklist[item.key] = true;
    expect(checklistComplete(checklist)).toBe(true);
    checklist.colchon = false;
    expect(checklistComplete(checklist)).toBe(false);
  });

  it("cuenta las órdenes por etapa", () => {
    const counts = stageCounts([
      { status: "pendiente" },
      { status: "pendiente" },
      { status: "completada" },
      { status: "habilitada" },
    ]);
    expect(counts).toEqual({ pendiente: 2, completada: 1, equipada: 0, habilitada: 1 });
  });
});
