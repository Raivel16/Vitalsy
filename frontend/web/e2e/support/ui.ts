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
  // Solo dentro del formulario: la gráfica evolutiva repite etiquetas como «Pulso».
  const form = page.locator("form").filter({ has: page.getByLabel("Frecuencia respiratoria") }).first();
  await form.getByLabel("Frecuencia respiratoria").fill(String(v.respiratoryRate));
  await form.getByLabel("Saturación").fill(String(v.spo2));
  await form.getByLabel("Presión sistólica").fill(String(v.systolic));
  await form.getByLabel("Presión diastólica").fill(String(v.diastolic));
  await form.getByLabel("Pulso").fill(String(v.pulse));
  await form.getByLabel("Temperatura").fill(String(v.temperature));
  // La reevaluación de alertas no trae escala ni oxígeno: solo se llenan los campos presentes.
  const scale = form.getByLabel("Escala de SpO2");
  if ((await scale.count()) > 0) await scale.selectOption(v.spo2Scale === 1 ? "scale1" : "scale2");
  // Admisión usa un <select>; atención y controles, una casilla.
  const o2 = form.getByLabel("Oxígeno suplementario");
  if ((await o2.count()) > 0) {
    if ((await o2.evaluate((el) => el.tagName)) === "SELECT") await o2.selectOption(v.supplementalO2 ? "yes" : "no");
    else await o2.setChecked(v.supplementalO2);
  }
  await form.getByLabel("Conciencia").selectOption(CONSCIOUSNESS_OPTION[v.consciousness]);
}

/**
 * Pulsa una acción del detalle de alerta y espera a que la página recargue el evento
 * (GET …/timeline). Así el aviso de éxito se comprueba después de la recarga y el resultado
 * no depende de la velocidad del servidor.
 */
export async function clickAndAwaitTimeline(page: Page, button: ReturnType<Page["getByRole"]>): Promise<void> {
  const reloaded = page.waitForResponse((r) => r.url().includes("/timeline") && r.request().method() === "GET");
  await button.click();
  await reloaded;
}
