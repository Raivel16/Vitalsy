import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";
import { FormActions } from "./FormActions";

describe("FormActions", () => {
  it("agrupa acciones en la fila actions", () => {
    render(
      <FormActions>
        <Button type="button">Registrar cobertura</Button>
        <a href="/admision/cobertura/derivacion">Derivar trámite</a>
      </FormActions>,
    );

    const actions = screen.getByRole("button", { name: /registrar cobertura/i }).parentElement;
    expect(actions).toHaveClass("actions");
    expect(screen.getByRole("link", { name: /derivar trámite/i })).toBeInTheDocument();
  });

  it("permite alinear el CTA al centro", () => {
    render(
      <FormActions align="center">
        <Button type="button">Abrir atención en piso</Button>
      </FormActions>,
    );
    expect(screen.getByRole("button", { name: /abrir atención en piso/i }).parentElement).toHaveClass("actions-center");
  });
});
