type AudioContextFactory = () => AudioContext;

export type AlertSiren = {
  /** Arranca el bucle de pitidos. Es idempotente. */
  start: () => void;
  /** Detiene el bucle y libera el contexto de audio. */
  stop: () => void;
  isPlaying: () => boolean;
  /** true cuando el navegador bloqueó el audio por falta de gesto del usuario. */
  isBlocked: () => boolean;
  /** Prepara el contexto aprovechando un gesto del usuario (submit del login). */
  unlock: () => void;
};

const BEEP_MS = 250;
const GAP_MS = 550;
const FIRST_TONE_HZ = 880;
const SECOND_TONE_HZ = 660;

function defaultFactory(): AudioContext {
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  return new Ctor();
}

/**
 * RF-53: señal sonora continua mientras existan alertas sin confirmar. Se
 * genera con osciladores Web Audio para no depender de un archivo de audio.
 */
export function createAlertSiren(factory: AudioContextFactory = defaultFactory): AlertSiren {
  let context: AudioContext | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;
  let playing = false;
  let blocked = false;
  let alternate = false;

  function ensureContext(): AudioContext | null {
    try {
      context ??= factory();
    } catch {
      blocked = true;
      return null;
    }

    if (context.state === "suspended") {
      blocked = true;
      void context.resume?.();
    } else {
      blocked = false;
    }

    return context;
  }

  function beep(): void {
    const ctx = ensureContext();
    if (!ctx) return;

    try {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.frequency.value = alternate ? SECOND_TONE_HZ : FIRST_TONE_HZ;
      alternate = !alternate;
      // Rampa corta para evitar el chasquido al abrir y cerrar la nota.
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.02);
      gain.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + BEEP_MS / 1000);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + BEEP_MS / 1000);
    } catch {
      blocked = true;
    }
  }

  return {
    start() {
      if (playing) return;
      playing = true;
      beep();
      timer = setInterval(beep, BEEP_MS + GAP_MS);
    },
    stop() {
      playing = false;
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      void context?.close?.();
      context = null;
    },
    isPlaying: () => playing,
    isBlocked: () => blocked,
    unlock() {
      ensureContext();
    },
  };
}

/** Sirena compartida por la aplicación. */
export const alertSiren = createAlertSiren();
