import type { Page } from "@playwright/test";
import type { Vitals } from "./data";

// RNF-18: utilidades de pantalla compartidas por las pruebas por módulo.

export function withIngreso(path: string, encounterId: string): string {
  return `${path}?ingreso=${encodeURIComponent(encounterId)}`;
}

export type PrintedDocument = { title: string; text: string; html: string };

/**
 * Intercepta window.print() en todos los frames (la impresión usa un iframe srcdoc) y guarda
 * el documento que se habría impreso. Llamar antes de page.goto.
 */
export async function capturePrints(page: Page): Promise<() => Promise<PrintedDocument[]>> {
  await page.addInitScript(() => {
    window.print = () => {
      const top = window.top as Window & { __vitalsyPrints?: unknown[] };
      top.__vitalsyPrints = [
        ...(top.__vitalsyPrints ?? []),
        { title: document.title, text: document.body.innerText, html: document.body.innerHTML },
      ];
    };
  });
  return () => page.evaluate(() => ((window as Window & { __vitalsyPrints?: PrintedDocument[] }).__vitalsyPrints ?? []) as PrintedDocument[]);
}

const CONSCIOUSNESS_OPTION = { A: "alert", C: "confusion", V: "voice", P: "pain", U: "unresponsive" } as const;

/** Llena el formulario de constantes (admisión y atención comparten etiquetas). */
export async function fillVitals(page: Page, v: Vitals): Promise<void> {
  await page.getByLabel("Frecuencia respiratoria").fill(String(v.respiratoryRate));
  await page.getByLabel("Saturación").fill(String(v.spo2));
  await page.getByLabel("Presión sistólica").fill(String(v.systolic));
  await page.getByLabel("Presión diastólica").fill(String(v.diastolic));
  await page.getByLabel("Pulso").fill(String(v.pulse));
  await page.getByLabel("Temperatura").fill(String(v.temperature));
  await page.getByLabel("Escala de SpO2").selectOption(v.spo2Scale === 1 ? "scale1" : "scale2");
  await page.getByLabel("Oxígeno suplementario").selectOption(v.supplementalO2 ? "yes" : "no");
  await page.getByLabel("Conciencia").selectOption(CONSCIOUSNESS_OPTION[v.consciousness]);
}
