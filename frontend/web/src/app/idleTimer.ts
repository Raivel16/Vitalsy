export const IDLE_LIMIT_MS = 5 * 60 * 1000;

const ACTIVITY = ["pointerdown", "keydown", "scroll"] as const;

export function bindIdleTimer(onIdle: () => void, limit = IDLE_LIMIT_MS): () => void {
  let timer = window.setTimeout(onIdle, limit);
  const bump = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(onIdle, limit);
  };

  ACTIVITY.forEach((event) => window.addEventListener(event, bump));

  return () => {
    window.clearTimeout(timer);
    ACTIVITY.forEach((event) => window.removeEventListener(event, bump));
  };
}
