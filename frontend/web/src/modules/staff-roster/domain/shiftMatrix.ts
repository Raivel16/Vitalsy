import { shiftWindow } from "./coverage";

/** D: día 07–19 · N: noche 19–07 · L: libre · R: retén confirmado (solo lectura). */
export type CellKind = "D" | "N" | "L" | "R";

export type MatrixRow = {
  userId: number;
  name: string;
  email?: string | null;
  role?: string | null;
  cells: Record<number, CellKind>;
};

type PlanShift = {
  userId: number;
  userName?: string | null;
  userRole?: string | null;
  startsAt: string;
  endsAt: string;
  unit: string | null;
};

type PlanRetainer = { userId: number; userName?: string | null; date: string };

export function daysOfMonth(yearMonth: string): number[] {
  const [year, month] = yearMonth.split("-").map(Number);
  const total = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return Array.from({ length: total }, (_, index) => index + 1);
}

const WEEKDAYS = [
  { short: "Do", long: "domingo" },
  { short: "Lu", long: "lunes" },
  { short: "Ma", long: "martes" },
  { short: "Mi", long: "miércoles" },
  { short: "Ju", long: "jueves" },
  { short: "Vi", long: "viernes" },
  { short: "Sá", long: "sábado" },
] as const;

/** Día real de la semana de una fecha del calendario (UTC: no depende de la zona horaria). */
export function weekdayOf(yearMonth: string, day: number): { short: string; long: string; weekend: boolean } {
  const [year, month] = yearMonth.split("-").map(Number);
  const index = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return { ...WEEKDAYS[index], weekend: index === 0 || index === 6 };
}

export function shiftMonth(yearMonth: string, delta: number): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const moved = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${moved.getUTCFullYear()}-${String(moved.getUTCMonth() + 1).padStart(2, "0")}`;
}

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

export function monthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  return `${MONTHS[month - 1]} de ${year}`;
}

export function cycleKind(kind: CellKind): CellKind {
  if (kind === "L") return "D";
  if (kind === "D") return "N";
  if (kind === "N") return "L";
  return kind;
}

export const KIND_LABEL: Record<CellKind, string> = {
  D: "Diurno (07:00–19:00)",
  N: "Noche (19:00–07:00)",
  L: "Libre",
  R: "Retén activo",
};

function dayOf(iso: string): number {
  return Number(iso.slice(8, 10));
}

function kindOf(startsAt: string): CellKind {
  const hour = Number(startsAt.slice(11, 13));
  return hour >= 19 || hour < 7 ? "N" : "D";
}

/** Une los turnos publicados y los retenes confirmados en una fila por persona. */
export function buildRows(shifts: PlanShift[], retainers: PlanRetainer[] = []): MatrixRow[] {
  const rows = new Map<number, MatrixRow>();
  const rowFor = (userId: number, name?: string | null, role?: string | null) => {
    let row = rows.get(userId);
    if (!row) {
      row = { userId, name: name ?? `Personal #${userId}`, role: role ?? null, cells: {} };
      rows.set(userId, row);
    }
    return row;
  };

  for (const shift of shifts) {
    rowFor(shift.userId, shift.userName, shift.userRole).cells[dayOf(shift.startsAt)] = kindOf(shift.startsAt);
  }
  for (const retainer of retainers) {
    rowFor(retainer.userId, retainer.userName).cells[dayOf(retainer.date)] = "R";
  }

  return [...rows.values()];
}

/** Turnos a publicar: solo D y N; libres y retenes no generan turno. */
export function toShifts(rows: MatrixRow[], yearMonth: string, unit: string) {
  const shifts: Array<{ userId: number; unit: string; startsAt: string; endsAt: string }> = [];
  for (const row of rows) {
    for (const [day, kind] of Object.entries(row.cells)) {
      if (kind !== "D" && kind !== "N") continue;
      const date = `${yearMonth}-${String(day).padStart(2, "0")}`;
      shifts.push({ userId: row.userId, unit, ...shiftWindow(date, kind === "D" ? "dia" : "noche") });
    }
  }
  return shifts;
}

export function countKinds(rows: MatrixRow[]): { staff: number; day: number; night: number } {
  let day = 0;
  let night = 0;
  let staff = 0;
  for (const row of rows) {
    const kinds = Object.values(row.cells);
    if (kinds.some((kind) => kind === "D" || kind === "N")) staff += 1;
    day += kinds.filter((kind) => kind === "D").length;
    night += kinds.filter((kind) => kind === "N").length;
  }
  return { staff, day, night };
}
