import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AuthForm } from './AuthForm';

describe('AuthForm', () => {
  it('shows field alerts before trying to sign in', async () => {
    await render(<AuthForm onLogin={() => ({ email: 'Escribe tu correo.', password: 'Escribe tu contraseña.' })} onRegister={() => ({})} />);
    fireEvent.press(screen.getByText('Iniciar sesión'));
    expect(await screen.findByText('Escribe tu correo.')).toBeTruthy();
    expect(screen.getByText('Escribe tu contraseña.')).toBeTruthy();
  });

  it('shows and hides the password', async () => {
    await render(<AuthForm onLogin={() => ({})} onRegister={() => ({})} />);
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

  it('explains that password recovery cannot send an email', async () => {
    await render(<AuthForm onLogin={() => ({})} onRegister={() => ({})} />);
    fireEvent.press(screen.getByText('¿Olvidaste tu contraseña?'));
    expect(await screen.findByText(/no puede enviar un correo/i)).toBeTruthy();
  });
});
