import { describe, expect, it } from "vitest";
import { createRowKeys, keyByContent } from "./rowKeys";

describe("keyByContent", () => {
  it("deriva claves del contenido y desambigua repetidos por orden de aparición", () => {
    const rows = keyByContent(["a", "b", "a"], (value) => value);
    expect(rows.map((row) => row.key)).toEqual(["a", "b", "a#2"]);
    expect(rows.map((row) => row.item)).toEqual(["a", "b", "a"]);
  });
});

describe("createRowKeys", () => {
  it("asigna una clave estable por objeto y la conserva al copiar", () => {
    const keys = createRowKeys();
    const first = { title: "" };
    const second = { title: "" };
    expect(keys.keyOf(first)).toBe(keys.keyOf(first));
    expect(keys.keyOf(first)).not.toBe(keys.keyOf(second));

    const edited = keys.carry(first, { ...first, title: "x" });
    expect(keys.keyOf(edited)).toBe(keys.keyOf(first));
  });
});
