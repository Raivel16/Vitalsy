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
});
