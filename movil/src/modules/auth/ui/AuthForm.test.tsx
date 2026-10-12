import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AuthForm } from './AuthForm';

const done = { errors: {} };

describe('AuthForm', () => {
  it('shows field alerts before trying to sign in', async () => {
    await render(
      <AuthForm
        onLogin={() => ({ errors: { email: 'Escribe tu correo.', password: 'Escribe tu contraseña.' } })}
        onRegister={() => done}
      />,
    );
    fireEvent.press(screen.getByText('Iniciar sesión'));
    expect(await screen.findByText('Escribe tu correo.')).toBeTruthy();
    expect(screen.getByText('Escribe tu contraseña.')).toBeTruthy();
  });

  it('shows and hides the password', async () => {
    await render(<AuthForm onLogin={() => done} onRegister={() => done} />);
    expect(screen.getByLabelText('Contraseña').props.secureTextEntry).toBe(true);
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Mostrar contraseña'));
    });
    expect(screen.getByLabelText('Contraseña').props.secureTextEntry).toBe(false);
    await act(async () => {
      fireEvent.press(screen.getByLabelText('Ocultar contraseña'));
    });
    expect(screen.getByLabelText('Contraseña').props.secureTextEntry).toBe(true);
  });

  it('in local-only mode shows the banner and explains that recovery cannot send an email', async () => {
    await render(<AuthForm localOnly onLogin={() => done} onRegister={() => done} />);
    expect(screen.getByText('Cuenta solo en este teléfono')).toBeTruthy();
    fireEvent.press(screen.getByText('¿Olvidaste tu contraseña?'));
    expect(await screen.findByText(/no puede enviar un correo/i)).toBeTruthy();
  });

  it('with a server there is no local-only banner nor local recovery message', async () => {
    await render(<AuthForm onLogin={() => done} onRegister={() => done} />);
    expect(screen.queryByText('Cuenta solo en este teléfono')).toBeNull();
    expect(screen.queryByText('¿Olvidaste tu contraseña?')).toBeNull();
  });

  it('disables the button while the request is in flight', async () => {
    let release: (value: { errors: Record<string, string> }) => void = () => undefined;
    const onLogin = jest.fn(() => new Promise<{ errors: Record<string, string> }>((resolve) => (release = resolve)));
    const onDone = jest.fn();
    await render(<AuthForm onDone={onDone} onLogin={onLogin} onRegister={() => done} />);
    await act(async () => {
      fireEvent.press(screen.getByText('Iniciar sesión'));
    });
    expect(screen.getByRole('button', { name: 'Iniciando sesión…' })).toBeTruthy();
    fireEvent.press(screen.getByRole('button', { name: 'Iniciando sesión…' }));
    expect(onLogin).toHaveBeenCalledTimes(1);
    await act(async () => release({ errors: {} }));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('shows notices after success and waits for Continuar', async () => {
    const onDone = jest.fn();
    await render(<AuthForm onDone={onDone} onLogin={() => ({ errors: {}, notices: ['Se cambió de cuenta; los datos locales anteriores se borraron.'] })} onRegister={() => done} />);
    fireEvent.press(screen.getByText('Iniciar sesión'));
    expect(await screen.findByText(/Se cambió de cuenta/)).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText('Continuar'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('asks for confirmation before wiping unsent readings, and cancel keeps the form', async () => {
    const confirm = jest.fn(async () => ({ errors: {} }));
    const cancel = jest.fn(async () => undefined);
    const onDone = jest.fn();
    await render(
      <AuthForm onDone={onDone} onLogin={() => ({ errors: {}, confirmation: { pendingCount: 3, confirm, cancel } })} onRegister={() => done} />,
    );
    fireEvent.press(screen.getByText('Iniciar sesión'));
    expect(await screen.findByText('Hay 3 lecturas sin enviar de la otra cuenta. Si continúas, se borrarán de este teléfono.')).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.press(screen.getByText('Cancelar'));
    });
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(confirm).not.toHaveBeenCalled();
    expect(screen.getByText('Iniciar sesión')).toBeTruthy();
  });

  it('wipes and continues only after Continuar y borrar', async () => {
    const confirm = jest.fn(async () => ({ errors: {} }));
    const onDone = jest.fn();
    await render(
      <AuthForm
        onDone={onDone}
        onLogin={() => ({ errors: {}, confirmation: { pendingCount: 1, confirm, cancel: async () => undefined } })}
        onRegister={() => done}
      />,
    );
    fireEvent.press(screen.getByText('Iniciar sesión'));
    await act(async () => {
      fireEvent.press(await screen.findByText('Continuar y borrar'));
    });
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
