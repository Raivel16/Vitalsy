import { describe, expect, it } from "vitest";
import { elapsedLabel } from "./flowGuide";

describe("tiempo transcurrido en camas", () => {
  it("formatea el tiempo transcurrido", () => {
    const now = new Date("2026-10-09T12:00:00Z").getTime();
    expect(elapsedLabel("2026-10-09T11:59:40Z", now)).toBe("Hace instantes");
    expect(elapsedLabel("2026-10-09T11:46:00Z", now)).toBe("Hace 14 min");
    expect(elapsedLabel("2026-10-09T09:00:00Z", now)).toBe("Hace 3 h");
    expect(elapsedLabel("2026-10-07T12:00:00Z", now)).toBe("Hace 2 d");
    expect(elapsedLabel(null, now)).toBe("—");
  });
});
