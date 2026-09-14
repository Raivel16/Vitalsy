import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bindIdleTimer, IDLE_LIMIT_MS } from "./idleTimer";

describe("bindIdleTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("cierra la sesión a los 5 minutos sin actividad", () => {
    const onIdle = vi.fn();
    const stop = bindIdleTimer(onIdle);

    vi.advanceTimersByTime(IDLE_LIMIT_MS - 1);
    expect(onIdle).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onIdle).toHaveBeenCalledOnce();
    stop();
  });

  it("reinicia el plazo cuando hay actividad", () => {
    const onIdle = vi.fn();
    const stop = bindIdleTimer(onIdle);

    vi.advanceTimersByTime(IDLE_LIMIT_MS - 1000);
    window.dispatchEvent(new Event("keydown"));
    vi.advanceTimersByTime(IDLE_LIMIT_MS - 1);
    expect(onIdle).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onIdle).toHaveBeenCalledOnce();
    stop();
  });
});
