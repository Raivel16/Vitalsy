import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import { jsonResponse, renderApp } from "../../test/renderApp";

describe("indicaciones médicas basales", () => {
  beforeEach(() => {
    sessionStorage.setItem("vitalsy-role", "medico");
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it("muestra el documento pendiente y exige la confirmación para firmar", async () => {
    const user = userEvent.setup();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          jsonResponse(200, {
            simulated: true,
            orders: {
              status: "pendiente",
              statusLabel: "Pendiente de firma",
              items: ["Reposo relativo", "Oxígeno si SpO2 menor de 92 %"],
            },
          }),
        )
        .mockResolvedValueOnce(
          jsonResponse(201, {
            simulated: true,
            signature: { status: "firmado", physicianName: "Dr. Mateo Salas" },
          }),
        ),
    );

    renderApp("/medico/indicaciones");
    expect(await screen.findByRole("status", { name: /estado del documento/i })).toHaveTextContent(/pendiente de firma/i);
    expect(screen.getByText(/reposo relativo/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /firmar indicaciones/i }));
    expect(screen.getByLabelText(/nombre del médico/i)).toHaveAttribute("aria-invalid", "true");

    await user.type(screen.getByLabelText(/nombre del médico/i), "Dr. Mateo Salas");
    await user.type(screen.getByLabelText(/colegiatura/i), "CMP 12345");
    await user.click(screen.getByLabelText(/confirmo la firma electrónica simulada/i));
    await user.click(screen.getByRole("button", { name: /firmar indicaciones/i }));

    expect(await screen.findByRole("status", { name: /estado del documento/i })).toHaveTextContent(/firmado/i);
  });
});
