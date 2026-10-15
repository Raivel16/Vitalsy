import { contrastRatio } from './contrast';
import { brand } from './tokens';

describe('contrastRatio', () => {
  it('matches WCAG reference values', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 1);
    expect(contrastRatio('#FFFFFF', '#FFFFFF')).toBeCloseTo(1, 5);
  });

  it('keeps the wordmark pill text at AA (>= 4.5) over its background', () => {
    expect(contrastRatio(brand.pillText, brand.pillBg)).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps the wordmark word readable over the canvas', () => {
    expect(contrastRatio(brand.word, brand.canvas)).toBeGreaterThanOrEqual(4.5);
  });
});
