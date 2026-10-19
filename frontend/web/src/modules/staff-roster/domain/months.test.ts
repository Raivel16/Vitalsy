import { describe, expect, it } from "vitest";
import { orderMonthOptions } from "./months";

describe("orderMonthOptions", () => {
  it("incluye el mes actual, quita repetidos y ordena del más reciente al más antiguo", () => {
    const plans = [{ yearMonth: "2026-08" }, { yearMonth: "2026-10" }, { yearMonth: "2025-12" }, { yearMonth: "2026-08" }];
    expect(orderMonthOptions("2026-09", plans)).toEqual(["2026-10", "2026-09", "2026-08", "2025-12"]);
  });

  it("devuelve solo el mes actual cuando no hay planes publicados", () => {
    expect(orderMonthOptions("2026-10", [])).toEqual(["2026-10"]);
  });

  it("no depende del orden de entrada", () => {
    const a = orderMonthOptions("2026-01", [{ yearMonth: "2026-03" }, { yearMonth: "2026-02" }]);
    const b = orderMonthOptions("2026-01", [{ yearMonth: "2026-02" }, { yearMonth: "2026-03" }]);
    expect(a).toEqual(["2026-03", "2026-02", "2026-01"]);
    expect(b).toEqual(a);
  });
});
