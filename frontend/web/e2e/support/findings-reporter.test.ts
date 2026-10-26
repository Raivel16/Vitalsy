import { describe, expect, it } from "vitest";
import { CSV_HEADER, toCsvLine, toFindingRow, type FindingInput } from "./findings-reporter";

const base: FindingInput = {
  titlePath: ["", "parallel", "m2-atencion/emar.spec.ts", "RF-33 · e-MAR · bloquea el medicamento equivocado [E2-07]"],
  tags: [],
  errors: [
    {
      message:
        "Error: \u001b[2mexpect(\u001b[22m\u001b[31mlocator\u001b[39m\u001b[2m).\u001b[22mtoHaveText\u001b[2m(\u001b[22m\u001b[32mexpected\u001b[39m\u001b[2m)\u001b[22m\n\nExpected: \u001b[32m\"Los cinco correctos no coinciden. Administración bloqueada.\"\u001b[39m\nReceived: \u001b[31m\"Dosis administrada y firmada.\"\u001b[39m\n\nCall log: …",
    },
  ],
  attachments: [{ name: "trace", path: "C:/repo/frontend/web/e2e-results/artifacts/parallel/emar/trace.zip" }],
};

describe("toFindingRow", () => {
  const row = (input: Partial<FindingInput> = {}, id = "E2E-P1") =>
    Object.fromEntries(CSV_HEADER.map((h, i) => [h, toFindingRow({ ...base, ...input }, { id, seed: 1234, date: "2026-10-24", cwd: "C:/repo/frontend/web" })[i]]));

  it("separa esperado y obtenido de un error de toHaveText sin colores ANSI", () => {
    expect(row()["Resultado esperado"]).toBe('"Los cinco correctos no coinciden. Administración bloqueada."');
    expect(row()["Resultado obtenido"]).toBe('"Dosis administrada y firmada."');
  });

  it("toma el módulo, el RF y el paso de la guía del título", () => {
    expect(row()["Módulo"]).toBe("e-MAR");
    expect(row()["Paso de la guía"]).toBe("E2-07");
    expect(row()["Responsable / observaciones"]).toContain("RF-33");
  });

  it("usa el ID del hallazgo previo si la prueba tiene la etiqueta @hallazgo-HP-xx", () => {
    expect(row({ tags: ["@hallazgo-HP-02"] })["ID"]).toBe("HP-02");
    expect(row()["ID"]).toBe("E2E-P1");
  });

  it("la reproducción incluye la semilla y el título", () => {
    // PowerShell (la plataforma del usuario): la variable va antes del comando.
    expect(row()["Pasos para reproducir"]).toBe(
      '$env:E2E_SEED=1234; npm run e2e -- -g "RF-33 · e-MAR · bloquea el medicamento equivocado \\[E2-07\\]"',
    );
  });

  it("la evidencia es la ruta relativa de la traza y el estado es Abierto", () => {
    expect(row()["Evidencia"]).toBe("e2e-results/artifacts/parallel/emar/trace.zip");
    expect(row()["Estado"]).toBe("Abierto");
    expect(row()["Fecha"]).toBe("2026-10-24");
  });

  it("sin formato Expected/Received deja el mensaje completo en obtenido", () => {
    const r = row({ errors: [{ message: "POST /beds/requests → 500: Error del servidor" }] });
    expect(r["Resultado esperado"]).toBe("");
    expect(r["Resultado obtenido"]).toBe("POST /beds/requests → 500: Error del servidor");
  });
});

describe("toCsvLine", () => {
  it("escapa comas, comillas y saltos de línea", () => {
    expect(toCsvLine(["a,b", 'di "hola"', "x\ny", "simple"])).toBe('"a,b","di ""hola""","x\ny",simple');
  });
});
