import { singleFlight } from './singleFlight';

describe('singleFlight', () => {
  it('shares one in-flight run and allows a new one afterwards', async () => {
    let calls = 0;
    let release: () => void = () => undefined;
    const run = singleFlight(
      () =>
        new Promise<number>((resolve) => {
          calls += 1;
          release = () => resolve(calls);
        }),
    );
    const first = run();
    const second = run();
    expect(calls).toBe(1);
    release();
    await expect(Promise.all([first, second])).resolves.toEqual([1, 1]);
    const third = run();
    expect(calls).toBe(2);
    release();
    await third;
  });
});
