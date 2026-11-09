// CY-M3-03 · Validación del formulario de deterioro observado y registro de la alerta (RF-40).
import type { Hospitalized } from "../../support/vitalsy/scenarios";

describe("CY-M3-03 · registro de deterioro observado", () => {
  let patient: Hospitalized;

  before(() => {
    cy.hospitalize().then((created) => {
      patient = created;
    });
  });

  it("exige la descripción y notifica a la enfermera al registrar", () => {
    cy.loginAs("auxiliar_enfermeria");
    cy.visit(`/alertas/deterioro?ingreso=${patient.encounterId}`);

    cy.contains("button", "Registrar deterioro").click();
    cy.contains("Describa el deterioro observado.").should("be.visible");
    cy.screenshot("CY-M3-03-validacion");

    cy.get("textarea").first().type("Paciente pálido, respiración rápida y somnoliento.");
    cy.get("select").first().select("alta");
    cy.contains("button", "Registrar deterioro").click();
    cy.contains("Se registró el deterioro y se notificó a la enfermera de piso responsable.").should("be.visible");
    cy.screenshot("CY-M3-03-deterioro-registrado");

    cy.vitalsyApi("enfermera_piso", "GET", "/clinical-alerts/inbox").then(({ body }) => {
      const alerts = (body as { alerts: Array<{ encounterId: string; source: string; severity: string }> }).alerts;
      const alert = alerts.find((item) => item.encounterId === patient.encounterId);
      expect(alert, "alerta en la bandeja de enfermería").to.include({ source: "observacion", severity: "alta" });
    });
  });
});
