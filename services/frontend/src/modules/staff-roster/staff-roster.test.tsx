import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";

function stubStaff() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("/clinical-alerts/inbox")) return jsonResponse(200, { alerts: [], pending: 0 });
      if (url.includes("/assignments/suggest")) {
        return jsonResponse(200, { suggestion: { assignments: [{ nurseUserId: 1, encounterId: "ENC-1", news2Weight: 8 }] } });
      }
      if (url.includes("/assignments/approve")) return jsonResponse(201, { approved: true });
      if (url.includes("/shift-plans")) return jsonResponse(201, { plan: { yearMonth: "2026-09", published: true } });
      if (url.includes("/coverage-requests") && (init?.method ?? "GET") === "GET") {
        return jsonResponse(200, { requests: [] });
      }
      return jsonResponse(200, {});
    }),
  );
}

describe("personal asistencial (RF-72 a RF-82)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    sessionStorage.clear();
  });

  it("permite a la jefatura publicar el rol mensual", async () => {
    stubStaff();
    const user = userEvent.setup();
    renderApp("/personal", { role: "jefatura_enfermeria" });

    await user.type(await screen.findByLabelText(/identificador de la enfermera/i), "4");
    await user.click(screen.getByRole("button", { name: /publicar rol mensual/i }));
    expect(await screen.findByText(/rol mensual de turnos publicado/i)).toBeInTheDocument();
  });

  it("permite a la supervisora sugerir y aprobar la asignación", async () => {
    stubStaff();
    const user = userEvent.setup();
    renderApp("/personal", { role: "enfermera_supervisora" });

    await user.type(await screen.findByLabelText(/identificadores de enfermeras/i), "4,5");
    await user.click(screen.getByRole("button", { name: /sugerir distribución/i }));
    expect(await screen.findByText(/distribución sugerida/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /aprobar asignación/i }));
    expect(await screen.findByText(/asignación diaria aprobada/i)).toBeInTheDocument();
  });
});
