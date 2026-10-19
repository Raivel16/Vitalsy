import { describe, expect, it } from "vitest";
import { safeNextPath, withIngresoParam, withNextParam } from "./returnTo";

describe("returnTo helpers", () => {
  it("acepta solo rutas internas", () => {
    expect(safeNextPath("/atencion/emar")).toBe("/atencion/emar");
    expect(safeNextPath("https://evil.test")).toBeNull();
    expect(safeNextPath("//evil.test")).toBeNull();
  });

  it("compone next e ingreso", () => {
    expect(withNextParam("/pacientes", "/atencion/emar")).toBe("/pacientes?next=%2Fatencion%2Femar");
    expect(withIngresoParam("/atencion/emar", "ENC-1")).toBe("/atencion/emar?ingreso=ENC-1");
  });

  it("conserva el query existente y no depende del host base", () => {
    expect(withNextParam("/pacientes?tab=activos", "/atencion/emar")).toBe(
      "/pacientes?tab=activos&next=%2Fatencion%2Femar",
    );
    expect(withIngresoParam("/atencion/emar?vista=lista", "ENC 2")).toBe(
      "/atencion/emar?vista=lista&ingreso=ENC+2",
    );
    expect(withNextParam("/pacientes", "https://evil.test")).toBe("/pacientes");
  });
});
