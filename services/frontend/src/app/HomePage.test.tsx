import { screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { jsonResponse, renderApp } from "../test/renderApp";

describe("Inicio dashboard de turno", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("conserva los accesos del perfil y muestra la cola de trabajo", async () => {
    sessionStorage.setItem("vitalsy-role", "enfermera_piso");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo) => {
        const url = String(input);
        if (url.includes("/hospital-admission/encounters")) {
          return jsonResponse(200, { encounters: [], meta: { total: 6, page: 1, perPage: 1, lastPage: 1 } });
        }
        if (url.includes("/monitoring-controls")) {
          return jsonResponse(200, {
            controls: [
              {
                encounterId: "enc-1",
                patientName: "Carmen Vega",
                location: "Habitacion 308-A",
                overdue: true,
              },
            ],
          });
        }
        if (url.includes("/clinical-alerts/inbox")) {
          return jsonResponse(200, {
            alerts: [
              {
                id: 9,
                encounterId: "enc-2",
                patientName: "Luis Paredes",
                location: "Habitacion 401-A",
                source: "news2",
                severity: "alta",
                news2Total: 8,
                message: "Deterioro",
                status: "abierta",
                assignedRole: null,
                generatedAt: null,
                acknowledgeDueAt: null,
                followUpDueAt: null,
                reassessedAt: null,
                medicalDueAt: null,
                closedAt: null,
                needsSiren: true,
              },
            ],
          });
        }
        return jsonResponse(200, {});
      }),
    );

    renderApp("/");

    expect(screen.getByRole("heading", { name: /seguimiento en piso/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ver pacientes en curso/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /cola de trabajo/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Pacientes en turno")).toBeInTheDocument();
      expect(screen.getByText("6")).toBeInTheDocument();
      expect(screen.getByText("Carmen Vega")).toBeInTheDocument();
      expect(screen.getByText("Luis Paredes")).toBeInTheDocument();
    });

    expect(screen.getByRole("link", { name: /registrar constantes/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /abrir alerta/i })).toHaveAttribute("href", "/alertas/9");
  });

  it("mantiene el acceso de admision sin inventar metricas clinicas", () => {
    sessionStorage.setItem("vitalsy-role", "admision");
    renderApp("/");

    expect(screen.getByRole("link", { name: /^Ver pacientes en curso$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /registrar un ingreso manual/i })).toBeInTheDocument();
    expect(screen.queryByText("Controles vencidos")).not.toBeInTheDocument();
  });
});
