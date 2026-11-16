// CY-M4-01 · Proceso 4 (alta y egreso): el paciente hospitalizado entra al tablero y la salida respeta la secuencia.
import type { Hospitalized } from "../../support/vitalsy/scenarios";

describe("CY-M4-01 · egreso con secuencia obligatoria", () => {
  let patient: Hospitalized;

  before(() => {
    cy.hospitalize().then((created) => {
      patient = created;
    });
  });

  it("lista al paciente hospitalizado y abre su caso de alta", () => {
    cy.loginAs("enfermera_piso");
    cy.visit("/egreso");

    cy.contains("Pacientes en proceso de alta").should("be.visible");
    cy.get("table[aria-label='Pacientes hospitalizados']").contains("tr", patient.patientName).within(() => {
      cy.get("button").first().click();
    });
    cy.location("pathname").should("eq", `/egreso/${patient.encounterId}`);
    cy.screenshot("CY-M4-01-caso-de-alta");
  });

  it("rechaza la salida efectiva mientras no se cumplan los pasos previos", () => {
    cy.vitalsyApi("enfermera_piso", "POST", `/discharge/encounters/${patient.encounterId}/exit`).then(({ status, body }) => {
      expect(status).to.eq(422);
      expect(JSON.stringify(body)).to.not.eq("{}");
    });
    cy.vitalsyApi("enfermera_piso", "GET", `/discharge/encounters/${patient.encounterId}`).its("status").should("eq", 200);
  });

  it("no permite a admisión entrar al módulo de egreso", () => {
    cy.loginAs("admision");
    cy.visit("/egreso");
    cy.get("[role=alert]").should("contain", "no está disponible para su perfil");
  });
});
