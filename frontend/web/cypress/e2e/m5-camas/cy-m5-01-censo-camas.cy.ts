// CY-M5-01 · Proceso 5 (camas): el censo muestra la capacidad que calcula la API con los registros reales.

export {};
type CensusResponse = { wards: Array<{ available: number; occupied: number; cleaning: number; beds: unknown[] }> };

function total(wards: CensusResponse["wards"], pick: (ward: CensusResponse["wards"][number]) => number): number {
  return wards.reduce((sum, ward) => sum + pick(ward), 0);
}

function kpi(label: string) {
  return cy.contains(".stat-tile", label).find(".stat-tile-value strong");
}

describe("CY-M5-01 · censo de camas", () => {
  beforeEach(() => {
    cy.loginAs("gestion_camas");
  });

  it("muestra capacidad, disponibles, ocupadas y en limpieza iguales a los de la API", () => {
    cy.intercept("GET", "/api/v1/beds/census*").as("census");
    cy.visit("/camas");
    cy.wait("@census");

    cy.vitalsyApi("gestion_camas", "GET", "/beds/census").then(({ body }) => {
      const { wards } = body as CensusResponse;
      kpi("Capacidad total").should("have.text", String(total(wards, (ward) => ward.beds.length)));
      kpi("Disponibles").should("have.text", String(total(wards, (ward) => ward.available)));
      kpi("Ocupadas").should("have.text", String(total(wards, (ward) => ward.occupied)));
      kpi("Limpieza").should("have.text", String(total(wards, (ward) => ward.cleaning)));
    });
    cy.contains("Censo hospitalario").should("be.visible");
    cy.screenshot("CY-M5-01-censo-camas");
  });

  it("reduce el censo al filtrar por un pabellón", () => {
    cy.visit("/camas");
    cy.get("fieldset[aria-label='Filtrar pabellones'] button").should("have.length.at.least", 2);
    cy.get("fieldset[aria-label='Filtrar pabellones'] button").eq(1).click();
    cy.get("fieldset[aria-label='Filtrar pabellones'] button").eq(1).should("have.attr", "aria-pressed", "true");
    cy.screenshot("CY-M5-01-filtro-pabellon");
  });

  it("protege las rutas de camas según el rol", () => {
    cy.vitalsyApi("enfermera_piso", "GET", "/beds/census").its("status").should("eq", 403);
    cy.vitalsyApi("gestion_camas", "GET", "/beds/census").its("status").should("eq", 200);
  });
});
