import { mkdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import type { FullConfig, Reporter, TestCase, TestResult } from "@playwright/test/reporter";

// RNF-18: vuelca cada prueba fallida a un CSV con las columnas de
// docs/operacion/registro-de-hallazgos.csv, listo para corregir y repetir.

export const CSV_HEADER = [
  "ID",
  "Fecha",
  "Módulo",
  "Rol / cuenta",
  "Paso de la guía",
  "Pasos para reproducir",
  "Resultado esperado",
  "Resultado obtenido",
  "Severidad (Bloqueante/Mayor/Menor/Mejora)",
  "Categoría",
  "Evidencia",
  "Estado",
  "Responsable / observaciones",
] as const;

export type FindingInput = {
  titlePath: string[];
  tags: string[];
  errors: { message?: string }[];
  attachments: { name: string; path?: string }[];
};

type RowContext = { id: string; seed: number | string; date: string; cwd: string };

// ESC + secuencia de color: se construye así para no escribir un carácter de control literal.
const ANSI = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");
const BOM = String.fromCharCode(0xfeff);

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function toFindingRow(input: FindingInput, ctx: RowContext): string[] {
  const title = input.titlePath.at(-1) ?? "";
  const module = title.split(" · ")[1] ?? "";
  const step = /\[(E\d+[a-z]?-\d+)\]/.exec(title)?.[1] ?? "";
  const hallazgo = input.tags.map((t) => /^@hallazgo-(HP-\d+)$/.exec(t)?.[1]).find(Boolean);
  const message = (input.errors[0]?.message ?? "").replace(ANSI, "");
  const expected = /^Expected[^:]*: (.*)$/m.exec(message)?.[1]?.trim();
  const received = /^Received[^:]*: (.*)$/m.exec(message)?.[1]?.trim();
  const trace = input.attachments.find((a) => a.name === "trace" && a.path)?.path;

  const row: Record<(typeof CSV_HEADER)[number], string> = {
    ID: hallazgo ?? ctx.id,
    Fecha: ctx.date,
    Módulo: module,
    "Rol / cuenta": "",
    "Paso de la guía": step,
    "Pasos para reproducir": `$env:E2E_SEED=${ctx.seed}; npm run e2e -- -g "${escapeRegExp(title)}"`,
    "Resultado esperado": expected ?? "",
    "Resultado obtenido": expected !== undefined && received !== undefined ? received : message.split("\n")[0].replace(/^Error: /, ""),
    "Severidad (Bloqueante/Mayor/Menor/Mejora)": "",
    Categoría: "",
    Evidencia: trace ? relative(ctx.cwd, trace).replaceAll("\\", "/") : "",
    Estado: "Abierto",
    "Responsable / observaciones": title,
  };
  return CSV_HEADER.map((h) => row[h]);
}

export function toCsvLine(cells: string[]): string {
  return cells.map((c) => (/[",\n\r]/.test(c) ? `"${c.replaceAll('"', '""')}"` : c)).join(",");
}

export default class FindingsReporter implements Reporter {
  private rows: string[][] = [];
  private outputFile = "";
  private readonly phase = process.env.E2E_PHASE;

  onBegin(config: FullConfig): void {
    this.outputFile = join(config.rootDir, "..", "e2e-results", this.phase ? `hallazgos-${this.phase}.csv` : "hallazgos.csv");
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.status !== "failed" && result.status !== "timedOut") return;
    const prefix = this.phase ? this.phase[0].toUpperCase() : "";
    this.rows.push(
      toFindingRow(
        { titlePath: test.titlePath(), tags: test.tags, errors: result.errors, attachments: result.attachments },
        { id: `E2E-${prefix}${this.rows.length + 1}`, seed: process.env.E2E_SEED ?? "", date: new Date().toISOString().slice(0, 10), cwd: process.cwd() },
      ),
    );
  }

  onEnd(): void {
    if (this.rows.length === 0) return;
    mkdirSync(join(this.outputFile, ".."), { recursive: true });
    const lines = [CSV_HEADER as unknown as string[], ...this.rows].map(toCsvLine);
    writeFileSync(this.outputFile, `${BOM}${lines.join("\r\n")}\r\n`, "utf8");
    if (!this.phase) console.log(`Hallazgos: ${this.outputFile} (${this.rows.length} filas)`);
  }

  printsToStdio(): boolean {
    return false;
  }
}
