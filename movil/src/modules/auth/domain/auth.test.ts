import { createHash } from 'crypto';
import { authenticate, PASSWORD_RECOVERY_MESSAGE, registerAccount, validateLogin, validateRegister } from './auth';

const digest = (value: string) => createHash('sha256').update(value).digest('hex');

describe('auth', () => {
  it('requires email and password before login', () => {
    expect(validateLogin('', '')).toEqual({
      email: 'Escribe tu correo.',
      password: 'Escribe tu contraseña.',
    });
  });

  it('registers a citizen and rejects a wrong password', () => {
    const created = registerAccount(
      [],
      { name: 'Elena', email: 'elena@correo.test', password: 'calma12345', confirm: 'calma12345' },
      'salt-1',
      digest,
    );
    expect(created.account?.name).toBe('Elena');
    const ok = authenticate(created.accounts, 'elena@correo.test', 'calma12345', digest);
    expect(ok.account?.id).toBe(created.account?.id);
    const bad = authenticate(created.accounts, 'elena@correo.test', 'otra-clave', digest);
    expect(bad.account).toBeUndefined();
    expect(bad.errors.form).toMatch(/incorrectos/i);
  });

  it('accepts usual emails and rejects malformed ones', () => {
    const invalid = 'El correo no tiene un formato válido.';
    for (const email of ['elena@correo.test', ' elena@correo.test ', 'e.l+x@sub.correo.com.pe']) {
      expect(validateLogin(email, 'calma12345').email).toBeUndefined();
    }
    for (const email of ['elena', 'elena@', '@correo.test', 'elena@correo', 'elena@correo.', 'ele na@correo.test', 'a@b..c', 'a@@b.c']) {
      expect(validateLogin(email, 'calma12345').email).toBe(invalid);
    }
  });

  it('validates a very long malformed email without stalling', () => {
    const started = Date.now();
    expect(validateLogin(`a@${'b.'.repeat(20000)}`, 'calma12345').email).toBeDefined();
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it('requires at least 10 characters with letters and numbers to register', () => {
    const base = { name: 'Elena', email: 'elena@correo.test' };
    const check = (password: string) => validateRegister({ ...base, password, confirm: password }).password;
    expect(check('abc12345')).toBe('Usa al menos 10 caracteres.');
    expect(check('calma12345')).toBeUndefined();
    expect(check('sololetrasaqui')).toBe('Usa letras y números.');
    expect(check('1234567890123')).toBe('Usa letras y números.');
  });

  it('does not pretend a recovery email was sent', () => {
    expect(PASSWORD_RECOVERY_MESSAGE).toMatch(/no puede enviar un correo/i);
  });
});
