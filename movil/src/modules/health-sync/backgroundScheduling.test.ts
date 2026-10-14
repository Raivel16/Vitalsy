import { defineHealthBackgroundTask, setHealthBackgroundSync, type BackgroundApi } from './backgroundScheduling';
import { HEALTH_BACKGROUND_TASK } from './backgroundSync';

function fakeApi(registered = false): BackgroundApi & { calls: string[]; executor?: () => Promise<unknown> } {
  const calls: string[] = [];
  const api: BackgroundApi & { calls: string[]; executor?: () => Promise<unknown> } = {
    calls,
    results: { success: 'SUCCESS', failed: 'FAILED' },
    defineTask: (name, executor) => {
      calls.push(`define:${name}`);
      api.executor = executor;
    },
    registerTaskAsync: async (name, options) => {
      calls.push(`register:${name}:${options.minimumInterval}`);
    },
    unregisterTaskAsync: async (name) => {
      calls.push(`unregister:${name}`);
    },
    isTaskRegisteredAsync: async () => registered,
  };
  return api;
}

describe('background scheduling', () => {
  it('registers the task with the 15 minute minimum', async () => {
    const api = fakeApi();
    await expect(setHealthBackgroundSync(true, api)).resolves.toBe(true);
    expect(api.calls).toEqual([`register:${HEALTH_BACKGROUND_TASK}:15`]);
  });

  it('does not register twice', async () => {
    const api = fakeApi(true);
    await setHealthBackgroundSync(true, api);
    expect(api.calls).toEqual([]);
  });

  it('unregisters on logout', async () => {
    const api = fakeApi(true);
    await expect(setHealthBackgroundSync(false, api)).resolves.toBe(true);
    expect(api.calls).toEqual([`unregister:${HEALTH_BACKGROUND_TASK}`]);
  });

  it('is a harmless false when the native modules are missing', async () => {
    await expect(setHealthBackgroundSync(true, null)).resolves.toBe(false);
    expect(defineHealthBackgroundTask(async () => 'noop', null)).toBe(false);
  });

  it('never throws when registration fails', async () => {
    const api = fakeApi();
    api.registerTaskAsync = async () => {
      throw new Error('restricted');
    };
    await expect(setHealthBackgroundSync(true, api)).resolves.toBe(false);
  });

  it('maps outcomes to the scheduler result and treats a no-op as success', async () => {
    const ok = fakeApi();
    defineHealthBackgroundTask(async () => 'noop', ok);
    await expect(ok.executor!()).resolves.toBe('SUCCESS');
    const bad = fakeApi();
    defineHealthBackgroundTask(async () => 'failed', bad);
    await expect(bad.executor!()).resolves.toBe('FAILED');
  });
});
