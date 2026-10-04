import { screen } from "@testing-library/react";
import { renderApp } from "../test/renderApp";

describe("shell del módulo 1", () => {
  it("anuncia el título y permite saltar al contenido", () => {
    renderApp("/");

    expect(screen.getByRole("heading", { name: /Vitalsy/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /saltar al contenido/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cerrar sesión/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Pacientes$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /registrar ingreso/i })).toBeInTheDocument();
    expect(screen.queryByText(/1\.1 Registro administrativo/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /orden de internamiento/i })).not.toBeInTheDocument();
  });

  it("cambia la navegación según el perfil", () => {
    sessionStorage.setItem("vitalsy-role", "medico_residente");
    renderApp("/");

    expect(screen.getByRole("link", { name: /^Pacientes$/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /registrar ingreso/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /indicaciones médicas/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/1\.3 Valoración y conciliación/i)).not.toBeInTheDocument();
  });

  it("no muestra códigos de requisito ni avisos de simulación", () => {
    renderApp("/");
    expect(screen.queryByText(/RF-\d+/)).not.toBeInTheDocument();
    expect(screen.queryByText(/simulad/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/demostraci/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/subproceso/i)).not.toBeInTheDocument();
  });

  it("explica el acceso denegado sin depender solo del color", () => {
    renderApp("/medico/indicaciones");

    expect(screen.getByRole("alert")).toHaveTextContent(/no está disponible para su perfil/i);
    expect(screen.getByRole("alert")).toHaveTextContent(/médico/i);
  });
});
