import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";

describe("escalas de riesgo", () => {
  beforeEach(() => {
    sessionStorage.setItem("vitalsy-role", "enfermeria");
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("calcula Morse y Braden y muestra el nivel con una recomendación escrita", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(201, { simulated: true, status: "registrada" })),
    );
    renderApp("/enfermeria/riesgos");

    await user.click(screen.getByLabelText(/antecedente de caídas: sí/i));
    await user.click(screen.getByLabelText(/marcha: alterada/i));
    expect(screen.getByRole("status", { name: /resultado de caídas/i })).toHaveTextContent(/riesgo alto de caídas/i);
    expect(screen.getByRole("status", { name: /resultado de caídas/i })).toHaveTextContent(/acompañ/i);

    await user.selectOptions(screen.getByLabelText(/percepción sensorial/i), "1");
    await user.selectOptions(screen.getByLabelText(/^humedad$/i), "1");
    await user.selectOptions(screen.getByLabelText(/^actividad$/i), "1");
    await user.selectOptions(screen.getByLabelText(/^movilidad$/i), "1");
    await user.selectOptions(screen.getByLabelText(/^nutrición$/i), "1");
    await user.selectOptions(screen.getByLabelText(/fricción/i), "1");
    expect(screen.getByRole("status", { name: /resultado de úlceras/i })).toHaveTextContent(/riesgo muy alto/i);
    expect(screen.getByRole("status", { name: /resultado de úlceras/i })).toHaveTextContent(/cambios posturales/i);

    await user.click(screen.getByRole("button", { name: /registrar escalas/i }));
    expect(await screen.findByRole("status", { name: /resultado del registro/i })).toHaveTextContent(/escalas registradas/i);
  });
});
