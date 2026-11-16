// CY-RP-01 · Indicadores hospitalarios (RF-115): el tablero muestra lo que calculan los registros reales.

export {};
type HospitalResponse = {
  flow: { admissions: number; discharges: number; daily: unknown[] };
  beds: { total: number; occupied: number };
  alerts: { totalAlerts: number };
};

function kpi(label: string) {
  return cy.contains(".stat-tile", label).find(".stat-tile-value strong");
}

/** Espera la carga inicial (en desarrollo StrictMode la repite) y vigila solo las consultas posteriores. */
function openAndWatch(alias: string) {
  cy.visit("/reportes/hospital");
  cy.wait("@hospital");
  kpi("Ocupación de camas").should("be.visible");
  cy.intercept("GET", "/api/v1/reports/hospital*").as(alias);
}

describe("CY-RP-01 · indicadores hospitalarios", () => {
  beforeEach(() => {
    cy.loginAs("jefatura_enfermeria");
    cy.intercept("GET", "/api/v1/reports/hospital*").as("hospital");
  });

  it("muestra indicadores, gráficos y tabla iguales a los de la API", () => {
    cy.visit("/reportes/hospital");
    cy.wait("@hospital").then(({ request }) => {
      const query = new URL(request.url).search;
      cy.vitalsyApi("jefatura_enfermeria", "GET", `/reports/hospital${query}`).then(({ body }) => {
        const report = body as HospitalResponse;
        kpi("Ingresos del período").should("have.text", String(report.flow.admissions));
        kpi("Alertas generadas").should("have.text", String(report.alerts.totalAlerts));
        cy.contains(".stat-tile", "Ocupación de camas").should("contain", `${report.beds.occupied} de ${report.beds.total} camas ocupadas`);
        cy.get("table[aria-label='Detalle diario de ingresos y altas'] tbody tr").should("have.length", report.flow.daily.length);
      });
    });
    cy.get("svg[role=img]").should("have.length.at.least", 3);
    cy.screenshot("CY-RP-01-indicadores");
  });

  it("filtra por sala y confirma la actualización", () => {
    openAndWatch("filtered");

    cy.get("#hospital-ward option").should("have.length.at.least", 2);
    cy.get("#hospital-ward option").eq(1).invoke("val").then((code) => {
      cy.get("#hospital-ward").select(String(code));
      cy.contains("button", "Consultar indicadores").click();
      cy.wait("@filtered").its("request.url").should("include", `ward=${String(code)}`);
    });
    cy.contains("Indicadores actualizados:").should("be.visible");
    cy.screenshot("CY-RP-01-filtro-sala");
  });

  it("no consulta con un rango de fechas inválido", () => {
    openAndWatch("afterSubmit");

    cy.get("#hospital-from").type("2030-01-01");
    cy.contains("button", "Consultar indicadores").click();
    cy.contains("La fecha final no puede ser anterior a la inicial.").should("be.visible");
    cy.get("[role=alert]").should("contain", "Revise los filtros");
    cy.get("@afterSubmit.all").should("have.length", 0);
    cy.screenshot("CY-RP-01-rango-invalido");
  });

  it("restringe el tablero por rol en la pantalla y en la API", () => {
    cy.vitalsyApi("enfermera_piso", "GET", "/reports/hospital").its("status").should("eq", 403);
    cy.vitalsyApi("gestion_camas", "GET", "/reports/hospital").its("status").should("eq", 200);

    cy.loginAs("enfermera_piso");
    cy.visit("/reportes/hospital");
    cy.get("[role=alert]").should("contain", "no está disponible para su perfil");
  });
});
