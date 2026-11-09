// CY-M3-04 · Actualización del estado: la enfermera confirma la recepción de la alerta (RF-44, RF-52, RF-53).
import type { Hospitalized, RaisedAlert } from "../../support/vitalsy/scenarios";

describe("CY-M3-04 · confirmación de recepción", () => {
  let patient: Hospitalized;
  let alert: RaisedAlert;

  before(() => {
    cy.hospitalize().then((created) => {
      patient = created;
      cy.raiseAlert(created.encounterId, "news2_medio").then((raised) => {
        alert = raised;
      });
    });
  });

  it("pasa la alerta a «en atención», la registra en el historial y no admite un segundo acuse", () => {
    cy.loginAs("enfermera_piso");
    cy.visit("/alertas");

    cy.contains(".alert-card", patient.patientName).within(() => {
      cy.contains("NEWS2 5").should("be.visible");
      cy.contains("button", "Confirmar recepción").click();
    });
    cy.get("output[aria-label='Resultado de la alerta']").should("contain", `Confirmó la recepción de la alerta de ${patient.patientName}`);
    cy.screenshot("CY-M3-04-recepcion-confirmada");

    cy.vitalsyApi("enfermera_piso", "GET", `/clinical-alerts/${alert.id}/timeline`).then(({ status, body }) => {
      expect(status).to.eq(200);
      const timeline = body as { alert: { status: string }; events: Array<{ type: string }> };
      expect(timeline.alert.status).to.eq("en_atencion");
      expect(timeline.events.map((event) => event.type)).to.include("recepcion");
    });

    // El historial es inmutable: un acuse repetido se rechaza por regla clínica.
    cy.vitalsyApi("enfermera_piso", "POST", `/clinical-alerts/${alert.id}/acknowledge`).its("status").should("eq", 422);
  });
});
