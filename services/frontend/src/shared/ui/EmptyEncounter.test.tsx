import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { EmptyEncounter } from "./EmptyEncounter";

describe("EmptyEncounter", () => {
  it("muestra el mensaje informativo y conserva la ruta pedida en next", () => {
    render(
      <MemoryRouter initialEntries={["/atencion/emar"]}>
        <EmptyEncounter message="Abra un paciente desde el censo para validar su filiación." />
      </MemoryRouter>,
    );

    expect(screen.getByRole("status")).toHaveTextContent(/abra un paciente/i);
    expect(screen.getByRole("link", { name: /ir a pacientes/i })).toHaveAttribute(
      "href",
      "/pacientes?next=%2Fatencion%2Femar",
    );
  });

  it("permite personalizar destino y etiqueta del CTA", () => {
    render(
      <MemoryRouter initialEntries={["/admision/filiacion"]}>
        <EmptyEncounter message="Sin ingreso activo." to="/pacientes/nuevo" ctaLabel="Registrar ingreso" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /registrar ingreso/i })).toHaveAttribute(
      "href",
      "/pacientes/nuevo?next=%2Fadmision%2Ffiliacion",
    );
  });
});
