import { readFileSync } from 'fs';
import { join } from 'path';

const assets = join(__dirname, '..', '..', '..', 'assets');

function header(name: string) {
  const buf = readFileSync(join(assets, name));
  expect(buf.subarray(1, 4).toString('ascii')).toBe('PNG');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), colorType: buf[25] };
}

describe('brand assets', () => {
  it.each([
    ['icon.png', 1024, 1024],
    ['splash-icon.png', 1024, 1024],
    ['android-icon-foreground.png', 1024, 1024],
    ['android-icon-background.png', 1024, 1024],
    ['android-icon-monochrome.png', 1024, 1024],
    ['favicon.png', 48, 48],
  ])('%s is %ix%i', (name, w, h) => {
    const info = header(name);
    expect([info.width, info.height]).toEqual([w, h]);
  });

  it('icon.png has no alpha channel (iOS)', () => {
    expect(header('icon.png').colorType).toBe(2);
  });

  it('adaptive foreground and monochrome keep an alpha channel', () => {
    expect(header('android-icon-foreground.png').colorType).toBe(6);
    expect(header('android-icon-monochrome.png').colorType).toBe(6);
  });
});
