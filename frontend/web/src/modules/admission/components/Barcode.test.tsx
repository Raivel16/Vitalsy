import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Barcode } from "./Barcode";

describe("Barcode", () => {
  it("muestra un código de barras visible para el valor emitido", async () => {
    render(<Barcode value="BRZ-0001-ANA" />);

    const barcode = await screen.findByRole("img", { name: /código de barras BRZ-0001-ANA/i });
    expect(barcode).toBeInTheDocument();
    expect(barcode.tagName.toLowerCase()).toBe("svg");

    await waitFor(() => {
      expect(barcode.querySelectorAll("rect").length).toBeGreaterThan(0);
    });
  });
});
