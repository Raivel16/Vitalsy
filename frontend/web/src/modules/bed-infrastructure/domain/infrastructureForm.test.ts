import { describe, expect, it } from "vitest";
import {
  bulkBedCount,
  type BulkFormValues,
  validateBedForm,
  validateBulkForm,
  validateWardForm,
} from "./infrastructureForm";

describe("validación de infraestructura de camas (RF-110–112)", () => {
  it("exige código, nombre y especialidad del pabellón", () => {
    expect(validateWardForm({ code: "", name: " ", specialty: "" })).toEqual({
      code: "El código es obligatorio.",
      name: "El nombre es obligatorio.",
      specialty: "Seleccione una especialidad.",
    });
    expect(validateWardForm({ code: "UCI-C", name: "Cuidados intensivos", specialty: "cuidados_intensivos" })).toEqual({});
  });

  it("limita el código del pabellón a letras, números y guion", () => {
    expect(validateWardForm({ code: "UCI C!", name: "x", specialty: "cirugia" }).code).toBe(
      "Use solo letras, números y guion.",
    );
  });

  it("exige pabellón, habitación y código de cama", () => {
    expect(validateBedForm({ wardId: "", room: "", bedCode: "", genderPolicy: "mixed", isolation: false })).toEqual({
      wardId: "Seleccione un pabellón.",
      room: "La habitación es obligatoria.",
      bedCode: "El código de cama es obligatorio.",
    });
  });

  it("valida el rango del alta en lote y calcula el total", () => {
    const base: BulkFormValues = { wardId: "1", roomFrom: "301", roomTo: "320", bedsPerRoom: "2", genderPolicy: "mixed", isolation: false };
    expect(validateBulkForm(base)).toEqual({});
    expect(bulkBedCount(base)).toBe(40);
    expect(validateBulkForm({ ...base, roomTo: "300" }).roomTo).toBe("La habitación final debe ser mayor o igual a la inicial.");
    expect(validateBulkForm({ ...base, bedsPerRoom: "7" }).bedsPerRoom).toBe("Indique de 1 a 6 camas por habitación.");
    expect(validateBulkForm({ ...base, roomFrom: "1", roomTo: "150" }).roomTo).toBe("El alta en lote admite hasta 200 camas por operación.");
    expect(validateBulkForm({ ...base, roomFrom: "3a" }).roomFrom).toBe("Use solo números.");
  });
});
