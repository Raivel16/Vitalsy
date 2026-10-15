import { render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Barcode, printBarcodeOnly } from "./Barcode";

describe("printBarcodeOnly", () => {
  afterEach(() => {
    document.querySelectorAll("iframe").forEach((frame) => frame.remove());
  });

  it("no hace nada si no existe el código en pantalla", () => {
    printBarcodeOnly("no-existe");
    expect(document.querySelector("iframe")).toBeNull();
  });

  it("imprime solo el código de barras del brazalete en un documento aparte", () => {
    render(
      <div id="wristband-barcode">
        <Barcode value="BRZ-0001-ANA" />
      </div>,
    );
    printBarcodeOnly();
    const frame = document.querySelector<HTMLIFrameElement>("iframe");

    const doc = new DOMParser().parseFromString(frame!.srcdoc, "text/html");
    expect(doc.querySelector("svg")).toBeTruthy();
    expect(doc.title).toBe("Brazalete");
    expect(doc.querySelector("style")?.textContent).toContain("90mm");
    expect(frame?.getAttribute("aria-hidden")).toBe("true");
  });
});
