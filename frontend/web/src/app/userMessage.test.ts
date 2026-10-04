import { describe, expect, it } from "vitest";
import { apiErrorMessage, userMessage } from "./userMessage";

describe("userMessage", () => {
  it("conserva un mensaje en español pensado para el usuario", () => {
    expect(userMessage("No se encontró la orden.", "No se pudo consultar la orden.")).toBe("No se encontró la orden.");
  });

  it("reemplaza errores técnicos o en inglés por un texto comprensible", () => {
    expect(userMessage("Failed to fetch", "No hay conexión con el servidor. Intente de nuevo.")).toBe(
      "No hay conexión con el servidor. Intente de nuevo.",
    );
    expect(userMessage("The given data was invalid.", "Revise los datos e intente de nuevo.")).toBe(
      "Revise los datos e intente de nuevo.",
    );
    expect(userMessage("SQLSTATE[23505]: duplicate key", "No se pudo completar la operación.")).toBe(
      "No se pudo completar la operación.",
    );
    expect(userMessage("", "No se pudo completar la operación.")).toBe("No se pudo completar la operación.");
  });

  it("usa el primer error de validación de Laravel cuando no hay message", () => {
    expect(apiErrorMessage({
      errors: { diastolicBloodPressure: ["La presión diastólica es obligatoria."] },
    }, "Revise los datos e intente de nuevo.")).toBe("La presión diastólica es obligatoria.");
  });
});
