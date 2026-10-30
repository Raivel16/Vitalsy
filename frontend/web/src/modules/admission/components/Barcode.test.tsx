import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Barcode } from "./Barcode";

function svgOf(img: HTMLElement): string {
  const src = img.getAttribute("src") ?? "";
  return decodeURIComponent(src.slice(src.indexOf(",") + 1));
}

describe("Barcode", () => {
  it("muestra un código de barras visible para el valor emitido", async () => {
    render(<Barcode value="BRZ-0001-ANA" />);

    const barcode = await screen.findByRole("img", { name: /código de barras BRZ-0001-ANA/i });
    expect(barcode).toBeInTheDocument();
    expect(svgOf(barcode).match(/<rect/g)?.length).toBeGreaterThan(0);
  });

  it("se expone como una imagen nativa con texto alternativo, no como un svg con role", () => {
    render(<Barcode value="BRZ-0001-ANA" />);

    const img = screen.getByRole("img", { name: /código de barras BRZ-0001-ANA/i });
    expect(img.tagName).toBe("IMG");
    expect(img.getAttribute("src")).toMatch(/^data:image\/svg\+xml/);
  });

  it("dibuja el valor dentro del svg y escapa los caracteres especiales", () => {
    render(<Barcode value={'A&B<1>"'} />);

    const markup = svgOf(screen.getByRole("img"));
    expect(markup).toContain("<svg");
    expect(markup).toContain("A&amp;B&lt;1&gt;&quot;");
  });

  it("conserva el contenedor imprimible con el id indicado", () => {
    const { container } = render(<Barcode value="X-1" id="mi-brazalete" />);

    expect(container.querySelector("#mi-brazalete .barcode")).not.toBeNull();
  });
});
