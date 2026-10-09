import { describe, expect, it } from "vitest";
import type { Bed, BedRequest, WardCensus } from "../types";
import { censusTotals, compatibleRequests, groupByRoom, occupiedDays, sharePct, wardInitials } from "./census";

const bed = (overrides: Partial<Bed>): Bed => ({
  id: 1, ward: "Medicina Interna A", room: "101", bedCode: "A", genderPolicy: "mixed", isolation: false, status: "available", ...overrides,
});
const ward = (overrides: Partial<WardCensus>): WardCensus => ({
  code: "MED-A", name: "Medicina Interna A", specialty: "medicina_interna", available: 0, occupied: 0, cleaning: 0, beds: [], ...overrides,
});
const request = (overrides: Partial<BedRequest>): BedRequest => ({
  id: 1, patientName: "Ana", priority: "alta", status: "pendiente", isolation: false, specialty: "medicina_interna", gender: "female", ...overrides,
});

describe("censo hospitalario (RF-69)", () => {
  it("totaliza capacidad, estados y aislamiento", () => {
    const wards = [
      ward({ available: 2, occupied: 3, cleaning: 1, beds: [bed({ isolation: true }), bed({ id: 2 })] }),
      ward({ code: "CIR-B", available: 1, occupied: 1, cleaning: 0, beds: [bed({ id: 3, isolation: true })] }),
    ];
    expect(censusTotals(wards)).toEqual({ capacity: 8, available: 3, occupied: 4, cleaning: 1, isolation: 2 });
  });

  it("calcula porcentajes sin dividir por cero", () => {
    expect(sharePct(18, 120)).toBe(15);
    expect(sharePct(0, 0)).toBe(0);
  });

  it("agrupa camas por habitación en orden", () => {
    const grouped = groupByRoom([bed({ id: 1, room: "302", bedCode: "A" }), bed({ id: 2, room: "301", bedCode: "A" }), bed({ id: 3, room: "301", bedCode: "B" })]);
    expect(grouped.map(([room, beds]) => [room, beds.length])).toEqual([["301", 2], ["302", 1]]);
  });

  it("abrevia el nombre del pabellón", () => {
    expect(wardInitials("Medicina Interna A")).toBe("MI");
    expect(wardInitials("Cirugía B")).toBe("CB");
  });

  it("cuenta los días de internación", () => {
    const now = new Date("2026-10-09T12:00:00Z").getTime();
    expect(occupiedDays("2026-10-06T12:00:00Z", now)).toBe(4);
    expect(occupiedDays(null, now)).toBeNull();
  });
});

describe("compatibilidad lecho ↔ solicitud (RF-72, espejo del servidor)", () => {
  const medicina = ward({});

  it("acepta un lecho convencional de la misma especialidad y género mixto", () => {
    expect(compatibleRequests(bed({}), medicina, [request({})])).toHaveLength(1);
  });

  it("rechaza otra especialidad", () => {
    expect(compatibleRequests(bed({}), medicina, [request({ specialty: "cirugia" })])).toHaveLength(0);
  });

  it("rechaza política de género distinta", () => {
    expect(compatibleRequests(bed({ genderPolicy: "male" }), medicina, [request({ gender: "female" })])).toHaveLength(0);
    expect(compatibleRequests(bed({ genderPolicy: "female" }), medicina, [request({ gender: "female" })])).toHaveLength(1);
  });

  it("reserva los lechos de aislamiento a quien los requiere", () => {
    expect(compatibleRequests(bed({ isolation: true }), medicina, [request({ isolation: false })])).toHaveLength(0);
    expect(compatibleRequests(bed({ isolation: false }), medicina, [request({ isolation: true })])).toHaveLength(0);
    expect(compatibleRequests(bed({ isolation: true }), medicina, [request({ isolation: true })])).toHaveLength(1);
  });

  it("ignora solicitudes ya asignadas", () => {
    expect(compatibleRequests(bed({}), medicina, [request({ status: "asignada" })])).toHaveLength(0);
  });
});
