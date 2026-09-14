import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderApp } from "../test/renderApp";

describe("shell del módulo 1", () => {
  it("anuncia el título, permite saltar al contenido y cambia la navegación según el rol", async () => {
    const user = userEvent.setup();
    renderApp("/");

    expect(screen.getByRole("heading", { name: /Vitalsy/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /saltar al contenido/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /orden de internamiento/i })).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText(/rol activo/i), "medico");

    expect(screen.getByRole("link", { name: /indicaciones médicas/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /orden de internamiento/i })).not.toBeInTheDocument();
  });

  it("no muestra códigos de requisito ni avisos de simulación", () => {
    renderApp("/");
    expect(screen.queryByText(/RF-\d+/)).not.toBeInTheDocument();
    expect(screen.queryByText(/simulad/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/demostraci/i)).not.toBeInTheDocument();
  });

  it("explica el acceso denegado sin depender solo del color", () => {
    renderApp("/medico/indicaciones");

    expect(screen.getByRole("alert")).toHaveTextContent(/no está disponible para el rol activo/i);
    expect(screen.getByRole("alert")).toHaveTextContent(/médico/i);
  });
});
