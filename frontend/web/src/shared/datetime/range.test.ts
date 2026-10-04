import { describe, expect, it } from "vitest";
import { dayKey, groupByDay, isWithinDateRange, resolveDateRange } from "./range";

describe("datetime range helpers", () => {
  it("agrupa por día local", () => {
    const groups = groupByDay(
      [
        { id: 1, at: "2026-09-21T10:00:00+00:00" },
        { id: 2, at: "2026-09-21T18:00:00+00:00" },
        { id: 3, at: "2026-09-20T08:00:00+00:00" },
      ],
      (item) => item.at,
      () => "día",
    );
    expect(groups).toHaveLength(2);
    expect(groups[0].items).toHaveLength(2);
  });

  it("filtra por rango resuelto", () => {
    const range = resolveDateRange("custom", "2026-09-20", "2026-09-21");
    expect(isWithinDateRange("2026-09-21T12:00:00", range)).toBe(true);
    expect(isWithinDateRange("2026-09-10T12:00:00", range)).toBe(false);
    expect(dayKey("2026-09-21T12:00:00")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
