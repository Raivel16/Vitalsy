// CY-M1-01 · Registro de información (Proceso 1): validación del formulario de ingreso y alta del encuentro.

export {};
const SUBMIT = "Registrar";

function typeField(selector: string, value: string) {
  cy.get(selector).clear();
  cy.get(selector).type(value);
}

describe("CY-M1-01 · registro de ingreso", () => {
  beforeEach(() => {
    cy.loginAs("admision");
    cy.visit("/pacientes/nuevo");
  });

  it("no envía el formulario vacío y señala cada campo obligatorio", () => {
    cy.intercept("POST", "/api/v1/hospital-admission/encounters").as("create");

    cy.contains("button", SUBMIT).click();

    cy.contains("El número de orden es obligatorio.").should("be.visible");
    cy.contains("El nombre del paciente es obligatorio.").should("be.visible");
    cy.contains("El documento es obligatorio.").should("be.visible");
    cy.contains("El plan de cobertura es obligatorio.").should("be.visible");
    cy.get("@create.all").should("have.length", 0);
    cy.screenshot("CY-M1-01-campos-obligatorios");
  });

  it("filtra el documento a dígitos y registra el ingreso con datos válidos", () => {
    const suffix = Date.now().toString(36).toUpperCase();
    cy.intercept("POST", "/api/v1/hospital-admission/encounters").as("create");

    typeField("#reg-order", `OI-CY-M1-${suffix}`);
    typeField("#reg-name", "Marta Quispe Rojas");
    typeField("#reg-document", "AB4C5D6E7F8G");
    cy.get("#reg-document").should("have.value", "45678");
    typeField("#reg-document", String(60_000_000 + (Date.now() % 9_000_000)));
    typeField("#reg-plan", "Regular");
    typeField("#reg-reason", "Control de ingreso programado");
    cy.screenshot("CY-M1-01-formulario-completo");

    cy.contains("button", SUBMIT).click();

    cy.wait("@create").then(({ response }) => {
      expect(response?.statusCode).to.eq(201);
      const encounter = (response?.body as { encounter: { encounterId: string; patientName: string } }).encounter;
      expect(encounter.patientName).to.eq("Marta Quispe Rojas");
      cy.location("pathname").should("not.eq", "/pacientes/nuevo");
      cy.vitalsyApi("admision", "GET", `/hospital-admission/encounters/${encounter.encounterId}`).its("status").should("eq", 200);
    });
    cy.screenshot("CY-M1-01-ingreso-registrado");
  });

  it("impide registrar con un perfil sin permiso de admisión", () => {
    cy.loginAs("enfermera_piso");
    cy.visit("/pacientes/nuevo");
    cy.get("[role=alert]").should("contain", "no está disponible para su perfil");
  });
});
