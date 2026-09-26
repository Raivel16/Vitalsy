import { screen } from "@testing-library/react";
import { renderApp } from "../test/renderApp";

describe("navegación módulo 2", () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it("muestra en el menú las acciones de atención del médico tratante", () => {
    sessionStorage.setItem("vitalsy-role", "medico_tratante");
    renderApp("/");

    expect(screen.getByRole("link", { name: /^expediente clínico$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^visita médica$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^evolución médica$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^laboratorio$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^imágenes$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^cpoe$/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^e-mar$/i })).not.toBeInTheDocument();
  });

  it("muestra e-MAR y constantes para enfermera de piso", () => {
    sessionStorage.setItem("vitalsy-role", "enfermera_piso");
    renderApp("/");

    expect(screen.getByRole("link", { name: /^e-mar$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^constantes$/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^cuidados$/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^cpoe$/i })).not.toBeInTheDocument();
  });
});
