import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";

function stubBeds() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/clinical-alerts/inbox")) return jsonResponse(200, { alerts: [], pending: 0 });
      if (url.includes("/beds/census")) {
        return jsonResponse(200, {
          wards: [{
            code: "MED-A",
            name: "Medicina Interna A",
            available: 1,
            occupied: 0,
            cleaning: 0,
            beds: [{ id: 1, ward: "Medicina Interna A", room: "101", bedCode: "A", isolation: false, status: "available" }],
          }],
        });
      }
      if (url.includes("/beds/requests") && (init?.method ?? "GET") === "GET") {
        return jsonResponse(200, { requests: [{ id: 9, patientName: "Paciente en espera", priority: "critica", status: "en_espera", isolation: false }] });
      }
      if (url.includes("/beds/requests") && init?.method === "POST") {
        return jsonResponse(201, { request: { id: 10, status: "en_espera" } });
      }
      if (url.includes("/cleaning-orders")) {
        return jsonResponse(200, { orders: [{ id: 3, bedId: 1, room: "202", bedCode: "A", protocol: "standard", status: "pendiente" }] });
      }
      return jsonResponse(200, {});
    }),
  );
}

describe("gestión de camas (RF-68 a RF-77)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it("muestra el censo y permite registrar una solicitud", async () => {
    stubBeds();
    const user = userEvent.setup();
    renderApp("/camas", { role: "gestion_camas" });

    expect(await screen.findByRole("heading", { name: /censo hospitalario/i })).toBeInTheDocument();
    expect(screen.getAllByText(/medicina interna a/i).length).toBeGreaterThan(0);
    await user.type(screen.getByLabelText(/paciente/i), "Paciente de urgencias");
    await user.click(screen.getByRole("button", { name: /registrar solicitud/i }));
    expect(await screen.findByText(/solicitud de cama registrada/i)).toBeInTheDocument();
  });
});
