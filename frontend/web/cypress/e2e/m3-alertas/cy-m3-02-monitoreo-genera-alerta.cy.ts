// CY-M3-02 · Registro de constantes (monitoreo) que genera una alerta automática (RF-30, RF-39).
import type { Hospitalized } from "../../support/vitalsy/scenarios";

describe("CY-M3-02 · el monitoreo genera la alerta", () => {
  let patient: Hospitalized;

  before(() => {
    cy.hospitalize().then((created) => {
      patient = created;
    });
  });

  it("registra constantes alteradas y la alerta llega a la bandeja de enfermería", () => {
    cy.loginAs("enfermera_piso");
    cy.visit(`/atencion/constantes?ingreso=${patient.encounterId}`);

    cy.get("#rr").type("26");
    cy.get("#spo2").type("90");
    cy.get("#sbp").type("120");
    cy.get("#dbp").type("75");
    cy.get("#pulse").type("115");
    cy.get("#temperature").type("36.8");
    cy.contains("button", "Registrar constantes").click();

    cy.get("output[aria-label='Resultado del registro']").should("contain", "Se activó el proceso de alertas (NEWS2 8)");
    cy.screenshot("CY-M3-02-constantes-registradas");

    cy.visit("/alertas");
    cy.contains(".alert-card", patient.patientName).within(() => {
      cy.contains("NEWS2 8").should("be.visible");
      cy.contains("Pendiente de recepción").should("be.visible");
    });
    cy.screenshot("CY-M3-02-alerta-en-bandeja");
  });
});
