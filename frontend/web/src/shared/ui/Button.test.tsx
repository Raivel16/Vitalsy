import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import { Button, ButtonLink } from "./Button";

describe("Button", () => {
  it("renderiza un botón primario y respeta disabled/pending", () => {
    const { rerender } = render(<Button type="submit">Guardar</Button>);
    expect(screen.getByRole("button", { name: /guardar/i })).toHaveClass("button");
    expect(screen.getByRole("button", { name: /guardar/i })).not.toBeDisabled();

    rerender(
      <Button type="submit" pending>
        Guardar
      </Button>,
    );
    expect(screen.getByRole("button", { name: /guardar/i })).toBeDisabled();

    rerender(
      <Button type="button" variant="quiet" disabled>
        Cancelar
      </Button>,
    );
    const quiet = screen.getByRole("button", { name: /cancelar/i });
    expect(quiet).toHaveClass("button", "button-quiet");
    expect(quiet).toBeDisabled();
  });
});

describe("ButtonLink", () => {
  it("renderiza un enlace con estilo de botón", () => {
    render(
      <MemoryRouter>
        <ButtonLink to="/pacientes">Ir a pacientes</ButtonLink>
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: /ir a pacientes/i });
    expect(link).toHaveAttribute("href", "/pacientes");
    expect(link).toHaveClass("button");
  });

  it("soporta variante quiet", () => {
    render(
      <MemoryRouter>
        <ButtonLink to="/pacientes/nuevo" variant="quiet">
          Registrar ingreso
        </ButtonLink>
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: /registrar ingreso/i })).toHaveClass("button", "button-quiet");
  });
});
