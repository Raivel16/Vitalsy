import { createHash } from 'crypto';
import { authenticate, PASSWORD_RECOVERY_MESSAGE, registerAccount, validateLogin } from './auth';

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
      { name: 'Elena', email: 'elena@correo.test', password: 'calma1234', confirm: 'calma1234' },
      'salt-1',
      digest,
    );
    expect(created.account?.name).toBe('Elena');
    const ok = authenticate(created.accounts, 'elena@correo.test', 'calma1234', digest);
    expect(ok.account?.id).toBe(created.account?.id);
    const bad = authenticate(created.accounts, 'elena@correo.test', 'otra-clave', digest);
    expect(bad.account).toBeUndefined();
    expect(bad.errors.form).toMatch(/incorrectos/i);
  });

  it('does not pretend a recovery email was sent', () => {
    expect(PASSWORD_RECOVERY_MESSAGE).toMatch(/no puede enviar un correo/i);
  });
});
