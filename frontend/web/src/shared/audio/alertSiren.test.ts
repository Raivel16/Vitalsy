import { vi } from "vitest";
import { createAlertSiren } from "./alertSiren";

type FakeNode = { connect: ReturnType<typeof vi.fn>; start?: ReturnType<typeof vi.fn>; stop?: ReturnType<typeof vi.fn> };

function fakeAudioContext() {
  const oscillators: FakeNode[] = [];
  const context = {
    state: "running" as string,
    currentTime: 0,
    destination: {},
    resume: vi.fn(async () => {
      context.state = "running";
    }),
    close: vi.fn(async () => {
      context.state = "closed";
    }),
    createOscillator: vi.fn(() => {
      const node: FakeNode = { connect: vi.fn(), start: vi.fn(), stop: vi.fn(), frequency: { value: 0 } } as FakeNode;
      oscillators.push(node);
      return node;
    }),
    createGain: vi.fn(() => ({
      connect: vi.fn(),
      gain: {
        value: 0,
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
    })),
  };

  return { context, oscillators };
}

describe("sirena de alertas (RF-53)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("suena en bucle hasta que se la detiene", () => {
    vi.useFakeTimers();
    const { context, oscillators } = fakeAudioContext();
    const siren = createAlertSiren(() => context as unknown as AudioContext);

    siren.start();
    expect(oscillators).toHaveLength(1);

    vi.advanceTimersByTime(3000);
    expect(oscillators.length).toBeGreaterThan(1);

    siren.stop();
    const emitted = oscillators.length;
    vi.advanceTimersByTime(5000);
    expect(oscillators).toHaveLength(emitted);
  });

  it("no se duplica si se la arranca dos veces", () => {
    vi.useFakeTimers();
    const { context, oscillators } = fakeAudioContext();
    const siren = createAlertSiren(() => context as unknown as AudioContext);

    siren.start();
    siren.start();
    expect(oscillators).toHaveLength(1);
    expect(siren.isPlaying()).toBe(true);

    siren.stop();
    expect(siren.isPlaying()).toBe(false);
  });

  it("informa cuando el navegador bloquea el audio sin gesto del usuario", () => {
    vi.useFakeTimers();
    const { context } = fakeAudioContext();
    context.state = "suspended";
    const siren = createAlertSiren(() => context as unknown as AudioContext);

    siren.start();

    expect(context.resume).toHaveBeenCalled();
    expect(siren.isBlocked()).toBe(true);
  });
});
