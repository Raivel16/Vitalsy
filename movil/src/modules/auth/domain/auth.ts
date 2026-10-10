export type Account = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
};

export type FieldErrors = Record<string, string>;

export type Digest = (value: string) => string;

// Las etiquetas del dominio excluyen el punto: así `\.` solo puede casar un separador y no hay retroceso.
const EMAIL = /^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/;

export function validateLogin(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!email.trim()) {
    errors.email = 'Escribe tu correo.';
  } else if (!EMAIL.test(email.trim())) {
    errors.email = 'El correo no tiene un formato válido.';
  }
  if (!password) {
    errors.password = 'Escribe tu contraseña.';
  }
  return errors;
}

export function validateRegister(input: { name: string; email: string; password: string; confirm: string }): FieldErrors {
  const errors = validateLogin(input.email, input.password);
  if (!input.name.trim()) {
    errors.name = 'Escribe tu nombre.';
  }
  if (input.password && input.password.length < 8) {
    errors.password = 'Usa al menos 8 caracteres.';
  }
  if (input.password !== input.confirm) {
    errors.confirm = 'Las contraseñas no coinciden.';
  }
  return errors;
}

export function hashPassword(password: string, salt: string, digest: Digest): string {
  return digest(`${salt}:${password}`);
}

export function registerAccount(
  accounts: Account[],
  input: { name: string; email: string; password: string; confirm: string },
  salt: string,
  digest: Digest,
): { accounts: Account[]; account?: Account; errors: FieldErrors } {
  const errors = validateRegister(input);
  const email = input.email.trim().toLowerCase();
  if (accounts.some((account) => account.email === email)) {
    errors.email = 'Ya existe una cuenta con ese correo.';
  }
  if (Object.keys(errors).length > 0) {
    return { accounts, errors };
  }
  const account: Account = {
    id: `user-${accounts.length + 1}`,
    name: input.name.trim(),
    email,
    salt,
    passwordHash: hashPassword(input.password, salt, digest),
  };
  return { accounts: [...accounts, account], account, errors: {} };
}

export function authenticate(
  accounts: Account[],
  email: string,
  password: string,
  digest: Digest,
): { account?: Account; errors: FieldErrors } {
  const errors = validateLogin(email, password);
  if (Object.keys(errors).length > 0) {
    return { errors };
  }
  const account = accounts.find((item) => item.email === email.trim().toLowerCase());
  if (!account || account.passwordHash !== hashPassword(password, account.salt, digest)) {
    return { errors: { form: 'Correo o contraseña incorrectos.' } };
  }
  return { account, errors: {} };
}

export const PASSWORD_RECOVERY_MESSAGE =
  'La recuperación de contraseña se envía cuando la cuenta está vinculada al servidor. Esta copia local no puede enviar un correo.';
