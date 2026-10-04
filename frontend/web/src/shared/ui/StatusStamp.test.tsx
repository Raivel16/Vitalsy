import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StatusStamp } from "./StatusStamp";

describe("StatusStamp", () => {
  it("muestra el estado de cobertura con rol status y clase según el valor", () => {
    const { rerender } = render(<StatusStamp status="aprobada" />);
    const stamp = screen.getByRole("status", { name: /cobertura aprobada/i });
    expect(stamp).toHaveClass("stamp", "stamp-aprobada");
    expect(stamp).toHaveTextContent(/cobertura aprobada/i);

    rerender(<StatusStamp status="pendiente" />);
    expect(screen.getByRole("status", { name: /cobertura pendiente/i })).toHaveClass("stamp-pendiente");

    rerender(<StatusStamp status="rechazada" />);
    expect(screen.getByRole("status", { name: /cobertura rechazada/i })).toHaveClass("stamp-rechazada");
  });
});
