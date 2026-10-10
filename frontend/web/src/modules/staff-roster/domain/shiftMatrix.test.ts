import {
  buildRows,
  countKinds,
  cycleKind,
  daysOfMonth,
  monthLabel,
  shiftMonth,
  toShifts,
} from "./shiftMatrix";

describe("matriz mensual de turnos (RF-78)", () => {
  it("calcula los días del mes, incluido febrero bisiesto", () => {
    expect(daysOfMonth("2026-09")).toHaveLength(30);
    expect(daysOfMonth("2028-02")).toHaveLength(29);
    expect(daysOfMonth("2026-10")[30]).toBe(31);
  });

  it("recorre meses sin saltos de año", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(monthLabel("2026-09")).toBe("septiembre de 2026");
  });

  it("cicla Libre → Día → Noche → Libre y no altera el retén", () => {
    expect(cycleKind("L")).toBe("D");
    expect(cycleKind("D")).toBe("N");
    expect(cycleKind("N")).toBe("L");
    expect(cycleKind("R")).toBe("R");
  });

  it("agrupa los turnos publicados por persona y distingue día de noche", () => {
    const rows = buildRows(
      [
        { userId: 4, userName: "Ana Piso", userRole: "enfermera_piso", startsAt: "2026-09-05T07:00:00+00:00", endsAt: "2026-09-05T19:00:00+00:00", unit: "Medicina" },
        { userId: 4, userName: "Ana Piso", userRole: "enfermera_piso", startsAt: "2026-09-06T19:00:00+00:00", endsAt: "2026-09-07T07:00:00+00:00", unit: "Medicina" },
        { userId: 5, userName: "Beto", userRole: "auxiliar_enfermeria", startsAt: "2026-09-05T19:00:00+00:00", endsAt: "2026-09-06T07:00:00+00:00", unit: "Medicina" },
      ],
      [{ userId: 6, userName: "Cora Retén", date: "2026-09-09" }],
    );

    expect(rows).toHaveLength(3);
    expect(rows[0].cells).toMatchObject({ 5: "D", 6: "N" });
    expect(rows[1].cells).toEqual({ 5: "N" });
    expect(rows[2].cells).toEqual({ 9: "R" });
  });

  it("convierte las celdas marcadas en turnos con su ventana horaria y omite libres y retenes", () => {
    const shifts = toShifts(
      [{ userId: 4, name: "Ana", cells: { 5: "D", 6: "N", 7: "L", 9: "R" } }],
      "2026-09",
      "Medicina",
    );

    expect(shifts).toEqual([
      { userId: 4, unit: "Medicina", startsAt: "2026-09-05T07:00:00", endsAt: "2026-09-05T19:00:00" },
      { userId: 4, unit: "Medicina", startsAt: "2026-09-06T19:00:00", endsAt: "2026-09-07T07:00:00" },
    ]);
  });

  it("cuenta personal, turnos de día y de noche", () => {
    expect(
      countKinds([
        { userId: 4, name: "Ana", cells: { 1: "D", 2: "D", 3: "N" } },
        { userId: 5, name: "Beto", cells: { 1: "N" } },
        { userId: 6, name: "Cora", cells: { 2: "R" } },
      ]),
    ).toEqual({ staff: 2, day: 2, night: 2 });
  });
});
