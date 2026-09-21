import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { EmptyEncounter } from "./EmptyEncounter";

describe("EmptyEncounter", () => {
  it("muestra el mensaje informativo y el CTA a pacientes", () => {
    render(
      <MemoryRouter>
        <EmptyEncounter message="Abra un paciente desde el censo para validar su filiación." />
      </MemoryRouter>,
    );

    expect(screen.getByRole("status")).toHaveTextContent(/abra un paciente/i);
    expect(screen.getByRole("link", { name: /ir a pacientes/i })).toHaveAttribute("href", "/pacientes");
  });

  it("permite personalizar destino y etiqueta del CTA", () => {
    render(
      <MemoryRouter>
        <EmptyEncounter message="Sin ingreso activo." to="/pacientes/nuevo" ctaLabel="Registrar ingreso" />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /registrar ingreso/i })).toHaveAttribute("href", "/pacientes/nuevo");
  });
});
