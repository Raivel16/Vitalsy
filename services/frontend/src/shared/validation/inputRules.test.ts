import { describe, expect, it } from "vitest";
import { digitsOnly, documentNumberError, phoneNumberError, requiredText } from "./inputRules";

describe("inputRules", () => {
  it("digitsOnly elimina letras y respeta el tope", () => {
    expect(digitsOnly("12ab34")).toBe("1234");
    expect(digitsOnly("999888777666555444", 15)).toBe("999888777666555");
  });

  it("documentNumberError exige dígitos", () => {
    expect(documentNumberError("")).toMatch(/obligatorio/i);
    expect(documentNumberError("45678A")).toMatch(/solo admite números/i);
    expect(documentNumberError("45678912")).toBeUndefined();
  });

  it("phoneNumberError exige dígitos con longitud válida", () => {
    expect(phoneNumberError("", { label: "El teléfono del familiar" })).toMatch(/obligatorio/i);
    expect(phoneNumberError("12ab", { label: "El teléfono del familiar" })).toMatch(/solo admite números/i);
    expect(phoneNumberError("123", { label: "El teléfono del familiar" })).toMatch(/7 a 15/i);
    expect(phoneNumberError("999111222", { label: "El teléfono del familiar" })).toBeUndefined();
  });

  it("requiredText marca vacíos y deja opcionales en blanco sin error propio", () => {
    expect(requiredText("  ", "El motivo es obligatorio.")).toBe("El motivo es obligatorio.");
    expect(requiredText("dolor torácico", "El motivo es obligatorio.")).toBeUndefined();
  });
});
