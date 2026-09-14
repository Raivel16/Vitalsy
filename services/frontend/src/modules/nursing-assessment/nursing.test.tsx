import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";

describe("valoración inicial de enfermería", () => {
  beforeEach(() => {
    sessionStorage.setItem("vitalsy-role", "enfermeria");
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("exige la anamnesis y permite registrar alergias", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(201, { simulated: true, assessment: { status: "registrada" } }),
      ),
    );
    renderApp("/enfermeria/valoracion");

    await user.click(screen.getByRole("button", { name: /guardar valoración/i }));
    expect(screen.getByLabelText(/motivo de consulta/i)).toHaveAttribute("aria-invalid", "true");

    await user.type(screen.getByLabelText(/motivo de consulta/i), "Disnea de dos días");
    await user.type(screen.getByLabelText(/alergia/i), "Penicilina");
    await user.click(screen.getByRole("button", { name: /agregar alergia/i }));
    expect(screen.getByText("Penicilina")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /guardar valoración/i }));
    expect(await screen.findByRole("status")).toHaveTextContent(/valoración registrada/i);
  });

  it("bloquea constantes imposibles y muestra NEWS2 con texto, no solo color", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(201, {
          simulated: true,
          news2: { total: 0, visualLabel: "Riesgo bajo", monitoring: "Mínimo cada 12 horas" },
        }),
      ),
    );
    renderApp("/enfermeria/constantes");

    await user.type(screen.getByLabelText(/frecuencia respiratoria/i), "2");
    await user.click(screen.getByRole("button", { name: /registrar constantes/i }));
    expect(screen.getByText(/no es posible/i)).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/frecuencia respiratoria/i));
    await user.type(screen.getByLabelText(/frecuencia respiratoria/i), "16");
    await user.type(screen.getByLabelText(/saturación/i), "98");
    await user.type(screen.getByLabelText(/presión sistólica/i), "120");
    await user.type(screen.getByLabelText(/pulso/i), "72");
    await user.type(screen.getByLabelText(/temperatura/i), "36.8");

    expect(screen.getByRole("status", { name: /resultado news2/i })).toHaveTextContent(/riesgo bajo/i);
    expect(screen.getByRole("status", { name: /resultado news2/i })).toHaveTextContent(/0 puntos/i);

    await user.clear(screen.getByLabelText(/frecuencia respiratoria/i));
    await user.type(screen.getByLabelText(/frecuencia respiratoria/i), "25");
    expect(screen.getByRole("alert")).toHaveTextContent(/revisión urgente/i);
  });
});
