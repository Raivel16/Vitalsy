import { FOREGROUND_POLL_INTERVAL_MS, startForegroundHealthPolling, type AppStateApi } from './foregroundPolling';

function fakeAppState(initial: string) {
  let listener: ((state: string) => void) | null = null;
  const api: AppStateApi & { currentState: string; emit: (state: string) => void; removed: number } = {
    currentState: initial,
    removed: 0,
    addEventListener: (_event, handler) => {
      listener = handler;
      return {
        remove: () => {
          api.removed += 1;
          listener = null;
        },
      };
    },
    emit: (state) => {
      api.currentState = state;
      listener?.(state);
    },
  };
  return api;
}

describe('foreground health polling', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('uses a 60 second interval', () => {
    expect(FOREGROUND_POLL_INTERVAL_MS).toBe(60_000);
  });

  it('reads right away and then every interval while active', async () => {
    const run = jest.fn(async () => undefined);
    const stop = startForegroundHealthPolling({ run, appState: fakeAppState('active') });
    await jest.advanceTimersByTimeAsync(0);
    expect(run).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(FOREGROUND_POLL_INTERVAL_MS * 2);
    expect(run).toHaveBeenCalledTimes(3);
    stop();
  });

  it('does not read while the app is in the background', async () => {
    const run = jest.fn(async () => undefined);
    const stop = startForegroundHealthPolling({ run, appState: fakeAppState('background') });
    await jest.advanceTimersByTimeAsync(FOREGROUND_POLL_INTERVAL_MS * 3);
    expect(run).not.toHaveBeenCalled();
    stop();
  });

  it('pauses in the background and resumes with an immediate read when active again', async () => {
    const run = jest.fn(async () => undefined);
    const appState = fakeAppState('active');
    const stop = startForegroundHealthPolling({ run, appState });
    await jest.advanceTimersByTimeAsync(0);
    appState.emit('background');
    await jest.advanceTimersByTimeAsync(FOREGROUND_POLL_INTERVAL_MS * 3);
    expect(run).toHaveBeenCalledTimes(1);
    appState.emit('active');
    await jest.advanceTimersByTimeAsync(0);
    expect(run).toHaveBeenCalledTimes(2);
    await jest.advanceTimersByTimeAsync(FOREGROUND_POLL_INTERVAL_MS);
    expect(run).toHaveBeenCalledTimes(3);
    stop();
  });

  it('skips a tick while the previous read is still running', async () => {
    let release: () => void = () => undefined;
    const run = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const stop = startForegroundHealthPolling({ run, appState: fakeAppState('active') });
    await jest.advanceTimersByTimeAsync(FOREGROUND_POLL_INTERVAL_MS * 3);
    expect(run).toHaveBeenCalledTimes(1);
    release();
    await jest.advanceTimersByTimeAsync(FOREGROUND_POLL_INTERVAL_MS);
    expect(run).toHaveBeenCalledTimes(2);
    stop();
  });

  it('keeps polling after a failed read', async () => {
    const run = jest.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValue(undefined);
    const stop = startForegroundHealthPolling({ run, appState: fakeAppState('active') });
    await jest.advanceTimersByTimeAsync(FOREGROUND_POLL_INTERVAL_MS);
    expect(run).toHaveBeenCalledTimes(2);
    stop();
  });

  it('stop clears the timer and the app state listener', async () => {
    const run = jest.fn(async () => undefined);
    const appState = fakeAppState('active');
    const stop = startForegroundHealthPolling({ run, appState });
    await jest.advanceTimersByTimeAsync(0);
    stop();
    await jest.advanceTimersByTimeAsync(FOREGROUND_POLL_INTERVAL_MS * 3);
    expect(run).toHaveBeenCalledTimes(1);
    expect(appState.removed).toBe(1);
  });
});
