import { printClinicalDocument } from "./printDocument";

describe("printClinicalDocument", () => {
  it("crea un iframe de impresión con el título del documento", () => {
    printClinicalDocument("Orden de internamiento", "<p>OI-2026-0001</p>");
    expect(document.querySelector("iframe[data-print-document='Orden de internamiento']")).toBeTruthy();
  });
});
