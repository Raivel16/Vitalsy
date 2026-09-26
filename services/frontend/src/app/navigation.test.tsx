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

describe("acceso de los roles de apoyo", () => {
  afterEach(() => {
    sessionStorage.clear();
  });

  it("no ofrece el censo de admisión a un rol de apoyo sin pantallas propias", () => {
    sessionStorage.setItem("vitalsy-role", "gestion_camas");
    renderApp("/");

    expect(screen.getByRole("link", { name: /^inicio$/i })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /^pacientes$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /ver pacientes en curso/i })).not.toBeInTheDocument();
    expect(screen.getByText(/estará disponible cuando se publique su módulo/i)).toBeInTheDocument();
  });

  it("mantiene el censo para los roles clínicos que intervienen en alertas", () => {
    sessionStorage.setItem("vitalsy-role", "enfermera_supervisora");
    renderApp("/");

    expect(screen.getByRole("link", { name: /^pacientes$/i })).toBeInTheDocument();
  });

  it("bloquea el censo por ruta directa a un rol sin acceso", () => {
    sessionStorage.setItem("vitalsy-role", "servicios_generales");
    renderApp("/pacientes");

    expect(screen.getByRole("alert")).toHaveTextContent(/no está disponible para su perfil/i);
  });
});
