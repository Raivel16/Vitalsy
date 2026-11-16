// CY-M3-06 · Navegación entre módulos y control de acceso por rol al módulo de alertas y reportes.
describe("CY-M3-06 · navegación y permisos", () => {
  it("admisión no ve el módulo de alertas ni puede abrirlo por URL", () => {
    cy.loginAs("admision");
    cy.visit("/");
    cy.contains("a", /^Alertas$/).should("not.exist");

    cy.visit("/alertas");
    cy.get("[role=alert]").should("contain", "no está disponible para su perfil");
    cy.screenshot("CY-M3-06-admision-sin-acceso");
  });

  it("la supervisora navega de la bandeja a los reportes de alertas", () => {
    cy.loginAs("enfermera_supervisora");
    cy.visit("/");
    cy.contains("a", /^Alertas$/).click();
    cy.location("pathname").should("eq", "/alertas");

    cy.contains("a", "Reportes de alertas").click();
    cy.location("pathname").should("eq", "/alertas/reportes");
    cy.contains("h2", "Reportes de monitoreo y alertas").should("be.visible");
    cy.screenshot("CY-M3-06-supervisora-reportes");
  });

  it("la API de reportes rechaza a la enfermera de piso", () => {
    cy.vitalsyApi("enfermera_piso", "GET", "/clinical-alerts/reports").its("status").should("eq", 403);
  });
});
