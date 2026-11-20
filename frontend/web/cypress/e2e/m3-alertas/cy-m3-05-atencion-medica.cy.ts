// CY-M3-05 · Proceso principal: la enfermera solicita atención médica y el residente la recibe (RF-43, RF-46).
import type { Hospitalized, RaisedAlert } from "../../support/vitalsy/scenarios";

describe("CY-M3-05 · escalamiento al médico de guardia", () => {
  let patient: Hospitalized;
  let alert: RaisedAlert;

  before(() => {
    cy.hospitalize().then((created) => {
      patient = created;
      cy.raiseAlert(created.encounterId, "news2_alto").then((raised) => {
        alert = raised;
        cy.vitalsyApi("enfermera_piso", "POST", `/clinical-alerts/${raised.id}/acknowledge`).its("status").should("eq", 200);
      });
    });
  });

  it("valida el motivo, notifica al médico y la alerta aparece en su bandeja", () => {
    cy.loginAs("enfermera_piso");
    cy.visit(`/alertas/${alert.id}`);

    cy.contains("[role=tab]", "Deterioro / preocupación clínica").click();
    cy.contains("button", "Solicitar atención médica").click();
    cy.contains("Indique por qué el caso requiere atención médica.").should("be.visible");

    cy.contains("label", "Motivo de la atención médica").invoke("attr", "for").then((id) => {
      cy.get(`#${id}`).type("Preocupación por empeoramiento rápido de la saturación.");
    });
    cy.contains("button", "Solicitar atención médica").click();
    cy.contains("Se notificó a los médicos de guardia (residente y tratante).").should("be.visible");
    cy.screenshot("CY-M3-05-medico-notificado");

    cy.loginAs("medico_residente");
    cy.visit("/alertas");
    cy.alertCard(alert.id).within(() => {
      cy.contains(patient.patientName).should("be.visible");
      cy.contains("Médico notificado").should("be.visible");
    });
    cy.screenshot("CY-M3-05-bandeja-medico");
  });
});
