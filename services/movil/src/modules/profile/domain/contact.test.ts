import { normalizeContact, validateContact } from './contact';

describe('emergency contact', () => {
  it('requires a name and a phone of digits', () => {
    expect(validateContact({ name: '', phone: 'abc', enabled: true }).name).toMatch(/nombre/i);
    expect(validateContact({ name: 'Ana', phone: '12', enabled: true }).phone).toMatch(/7 dígitos/);
  });

  it('keeps only digits in the phone', () => {
    expect(normalizeContact({ name: ' Ana ', phone: '+51 999-111-222', enabled: true })).toEqual({
      name: 'Ana',
      phone: '51999111222',
      enabled: true,
    });
  });
});
