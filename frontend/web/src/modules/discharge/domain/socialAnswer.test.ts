import { isAffirmative } from "./socialAnswer";

describe("isAffirmative", () => {
  it.each(["si", "Sí", "SI", " sí ", "Si"])("acepta «%s» como respuesta afirmativa", (value) => {
    expect(isAffirmative(value)).toBe(true);
  });

  it.each(["no", "", "sin", "tal vez"])("no acepta «%s» como respuesta afirmativa", (value) => {
    expect(isAffirmative(value)).toBe(false);
  });
});
