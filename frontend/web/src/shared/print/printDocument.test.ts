import { printClinicalDocument } from "./printDocument";

describe("printClinicalDocument", () => {
  afterEach(() => {
    document.querySelectorAll("iframe").forEach((frame) => frame.remove());
  });

  it("crea un iframe de impresión con el título del documento", () => {
    printClinicalDocument("Orden de internamiento", "<p>OI-2026-0001</p>");
    expect(document.querySelector("iframe[data-print-document='Orden de internamiento']")).toBeTruthy();
  });

  it("imprime un documento completo con título, cuerpo y pie institucional", () => {
    printClinicalDocument("Orden de internamiento", "<p>OI-2026-0001</p>");
    const frame = document.querySelector<HTMLIFrameElement>("iframe[data-print-document]");

    const doc = new DOMParser().parseFromString(frame!.srcdoc, "text/html");
    expect(doc.body.textContent).toContain("OI-2026-0001");
    expect(doc.documentElement.lang).toBe("es");
    expect(doc.title).toBe("Orden de internamiento");
    expect(doc.querySelector("h1")?.textContent).toBe("Orden de internamiento");
    expect(doc.querySelector(".kicker")?.textContent).toBe("Vitalsy Clinical");
    expect(doc.querySelector("footer")?.textContent).toBe("Documento generado para impresión institucional.");
    expect(doc.querySelector("style")?.textContent).toContain("footer");
    expect(frame?.getAttribute("aria-hidden")).toBe("true");
  });
});
