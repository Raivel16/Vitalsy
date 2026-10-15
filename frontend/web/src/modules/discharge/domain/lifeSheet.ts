import QRCode from "qrcode";
import { lifePlanCode, lifePlanValidUntil, type DischargeCase } from "./discharge";

function esc(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

/** Cuerpo HTML de la ficha de alta imprimible; incluye el QR de Vitalsy Life solo si el servidor emitió un código. */
export async function lifeSheetHtml(item: DischargeCase, role: string): Promise<string> {
  const report = item.nursingReport;
  const rows: string[] = [`<dl><dt>Paciente</dt><dd>${esc(item.patientName)}</dd>`];
  if (report) {
    rows.push(`<dt>Indicaciones de medicamentos</dt><dd>${esc(report.instructions)}</dd>`);
    if (report.alarmSigns) rows.push(`<dt>Signos de alarma</dt><dd>${esc(report.alarmSigns)}</dd>`);
    if (report.homeCare) rows.push(`<dt>Cuidados domiciliarios</dt><dd>${esc(report.homeCare)}</dd>`);
  }
  rows.push("</dl>");

  const code = lifePlanCode(item.lifePlan, role);
  if (code) {
    const svg = await QRCode.toString(code, {
      type: "svg",
      margin: 1,
      width: 160,
      color: { dark: "#1B2228", light: "#FFFFFF" },
    });
    const validUntil = lifePlanValidUntil(item.lifePlan);
    rows.push(
      `<section class="life-qr" aria-label="Vitalsy Life">${svg}`
      + "<p>Escanee con la app Vitalsy Life para activar su seguimiento</p>"
      + (validUntil ? `<p>Válido hasta: ${esc(validUntil)}</p>` : "")
      + `<p>Código: ${esc(code)}</p></section>`,
    );
  }
  return rows.join("");
}
