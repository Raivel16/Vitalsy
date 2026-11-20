// CY-M3-01 · Acceso y autenticación del personal que recibe alertas.
describe("CY-M3-01 · acceso de la enfermera de piso", () => {
  beforeEach(() => {
    cy.visit("/");
  });

  it("valida el formulario y rechaza una contraseña incorrecta", () => {
    cy.contains("button", "Entrar").click();
    cy.contains("El correo es obligatorio.").should("be.visible");
    cy.contains("La contraseña es obligatoria.").should("be.visible");

    cy.get("#email").type("enfermera_piso@vitalsy.local");
    cy.get("#password").type("clave-incorrecta");
    cy.contains("button", "Entrar").click();
    cy.get("[role=alert]").should("be.visible").and("not.be.empty");
    cy.screenshot("CY-M3-01-credenciales-invalidas");
  });

  it("ingresa con la cuenta demo y muestra el menú de alertas", () => {
    cy.get("#email").type("enfermera_piso@vitalsy.local");
    cy.env<{ DEMO_PASSWORD: string }>(["DEMO_PASSWORD"], { log: false }).then(({ DEMO_PASSWORD }) => {
      cy.get("#password").type(DEMO_PASSWORD, { log: false });
    });
    cy.contains("button", "Entrar").click();

    cy.location("pathname").should("eq", "/");
    cy.contains("a", "Alertas").should("have.attr", "href", "/alertas");
    cy.screenshot("CY-M3-01-sesion-iniciada");
  });
});
