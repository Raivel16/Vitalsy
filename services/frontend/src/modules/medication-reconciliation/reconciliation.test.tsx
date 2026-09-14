import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";

describe("conciliación farmacéutica de ingreso", () => {
  beforeEach(() => {
    sessionStorage.setItem("vitalsy-role", "enfermeria");
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("muestra dosis, vía y una alerta de alergia simulada, y distingue el estado", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(201, {
          simulated: true,
          reconciliation: { status: "con_observaciones", statusLabel: "Con observaciones" },
        }),
      ),
    );
    renderApp("/enfermeria/conciliacion");

    await user.type(screen.getByLabelText(/alergias conocidas/i), "Penicilina");
    await user.type(screen.getByLabelText(/^medicamento$/i), "Amoxicilina");
    await user.type(screen.getByLabelText(/dosis/i), "500 mg");
    await user.type(screen.getByLabelText(/frecuencia/i), "cada 8 horas");
    await user.selectOptions(screen.getByLabelText(/vía/i), "oral");
    await user.click(screen.getByRole("button", { name: /agregar medicamento/i }));

    expect(screen.getByRole("cell", { name: "500 mg" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /oral/i })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(/posible alergia/i);
    expect(screen.getByRole("status", { name: /estado de conciliación/i })).toHaveTextContent(/con observaciones/i);

    await user.click(screen.getByRole("button", { name: /registrar conciliación/i }));
    expect(await screen.findByRole("status", { name: /resultado del registro/i })).toHaveTextContent(/con observaciones/i);
  });
});
