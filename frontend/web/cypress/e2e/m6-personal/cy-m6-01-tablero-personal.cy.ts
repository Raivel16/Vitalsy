// CY-M6-01 · Proceso 6 (personal): el tablero cambia según el perfil que lo consulta.
describe("CY-M6-01 · tablero de personal", () => {
  it("muestra a la supervisora la asignación por carga NEWS2 y las coberturas", () => {
    cy.loginAs("enfermera_supervisora");
    cy.visit("/personal");

    cy.contains("Turnos, asignación y cobertura").should("be.visible");
    cy.get("aside[aria-label='Contingencias y coberturas']").should("be.visible");
    cy.screenshot("CY-M6-01-supervisora");
  });

  it("muestra a jefatura el tablero de publicación del rol", () => {
    cy.loginAs("jefatura_enfermeria");
    cy.visit("/personal");

    cy.contains("Gestión de personal").should("be.visible");
    cy.get("aside[aria-label='Contingencias y coberturas']").should("not.exist");
    cy.screenshot("CY-M6-01-jefatura");
  });

  it("bloquea el tablero a un perfil sin gestión de personal", () => {
    cy.loginAs("camillero");
    cy.visit("/personal");
    cy.get("[role=alert]").should("contain", "no está disponible para su perfil");
  });
});
