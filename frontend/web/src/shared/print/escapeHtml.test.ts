import { escapeHtml } from "./printDocument";

describe("escapeHtml", () => {
  it("convierte el marcado en texto para que no se ejecute al imprimir", () => {
    expect(escapeHtml('<img src=x onerror="alert(1)">')).toBe("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });

  it("escapa & y apóstrofos sin tocar los acentos", () => {
    expect(escapeHtml("Peña & O'Brien")).toBe("Peña &amp; O&#39;Brien");
  });

  it("acepta valores vacíos", () => {
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml(null)).toBe("");
  });
});
