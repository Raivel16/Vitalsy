// CY-M3-07 · Reportes de monitoreo y alertas (RF-114): indicadores calculados con los registros reales.
type ReportResponse = { summary: { totalAlerts: number }; period: { from: string; to: string } };

function kpi(label: string) {
  return cy.contains(".stat-tile", label).find(".stat-tile-value strong");
}

/** Espera la carga inicial (en desarrollo StrictMode la repite) y vigila solo las consultas posteriores. */
function openReportsAndWatch(alias: string) {
  cy.visit("/alertas/reportes");
  cy.wait("@report");
  kpi("Alertas generadas").should("be.visible");
  cy.intercept("GET", "/api/v1/clinical-alerts/reports*").as(alias);
}

describe("CY-M3-07 · reportes de alertas", () => {
  beforeEach(() => {
    cy.loginAs("jefatura_enfermeria");
    cy.intercept("GET", "/api/v1/clinical-alerts/reports*").as("report");
  });

  it("muestra los indicadores que coinciden con los registros del sistema", () => {
    cy.visit("/alertas/reportes");
    cy.wait("@report").then(({ request, response }) => {
      const query = new URL(request.url).search;
      cy.vitalsyApi("enfermera_supervisora", "GET", `/clinical-alerts/reports${query}`).then(({ body }) => {
        const expected = (body as ReportResponse).summary.totalAlerts;
        expect((response?.body as ReportResponse).summary.totalAlerts).to.eq(expected);
        kpi("Alertas generadas").should("have.text", String(expected));
      });
    });
    cy.get("svg[role=img]").should("have.length.at.least", 4);
    cy.get("table[aria-label='Detalle diario de alertas'] tbody tr").should("have.length", 7);
    cy.screenshot("CY-M3-07-indicadores", { capture: "fullPage" });
  });

  it("filtra por severidad y confirma la actualización", () => {
    openReportsAndWatch("filtered");

    cy.get("#report-severity").select("alta");
    cy.contains("button", "Consultar reporte").click();
    cy.wait("@filtered").its("request.url").should("include", "severity=alta");
    cy.contains("Reporte actualizado:").should("be.visible");
    cy.screenshot("CY-M3-07-filtro-severidad");
  });

  it("no consulta con un rango de fechas inválido", () => {
    openReportsAndWatch("afterSubmit");

    cy.get("#report-from").type("2030-01-01");
    cy.contains("button", "Consultar reporte").click();
    cy.contains("La fecha final no puede ser anterior a la inicial.").should("be.visible");
    cy.get("[role=alert]").should("contain", "Revise los filtros");
    cy.get("@afterSubmit.all").should("have.length", 0);
    cy.screenshot("CY-M3-07-rango-invalido");
  });
});
