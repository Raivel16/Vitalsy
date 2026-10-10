import { type FormEvent, useState } from "react";
import { changePasswordRequest } from "./api";
import { useAuth } from "./AuthProvider";
import { errorText } from "./userMessage";
import { Button } from "../shared/ui/Button";
import { SealIcon } from "../shared/ui/Icons";
import { TextField } from "../shared/ui/Field";
import { Feedback } from "../shared/ui/Sheet";

/** RF-102: la cuenta con contraseña temporal solo puede cambiarla o cerrar sesión. */
export function ChangePasswordPage() {
  const { setUser, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!currentPassword) next.currentPassword = "Ingrese la contraseña temporal.";
    if (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
      next.password = "Use al menos 10 caracteres con letras y números.";
    } else if (password === currentPassword) {
      next.password = "La nueva contraseña debe ser distinta de la temporal.";
    }
    if (confirmation !== password) next.confirmation = "Las contraseñas no coinciden.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    setError("");
    try {
      const data = await changePasswordRequest({ currentPassword, password, passwordConfirmation: confirmation });
      setUser(data.user);
    } catch (caught) {
      setError(errorText(caught, "No se pudo cambiar la contraseña."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-screen" id="contenido">
      <form className="login-card stack" onSubmit={onSubmit} noValidate>
        <div className="brand">
          <div className="brand-lockup">
            <h1>Vitalsy</h1>
            <SealIcon />
            <p>Gestión clínica hospitalaria</p>
          </div>
        </div>
        <h2>Cambie su contraseña</h2>
        <p className="lead">Su cuenta tiene una contraseña temporal. Defina una nueva para continuar.</p>
        <TextField
          id="current-password"
          label="Contraseña actual"
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          error={errors.currentPassword}
        />
        <TextField
          id="new-password"
          label="Nueva contraseña"
          type="password"
          autoComplete="new-password"
          hint="Mínimo 10 caracteres, con letras y números."
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password}
        />
        <TextField
          id="confirm-password"
          label="Confirmar nueva contraseña"
          type="password"
          autoComplete="new-password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          error={errors.confirmation}
        />
        {error ? <Feedback tone="error">{error}</Feedback> : null}
        <Button type="submit" pending={loading}>Guardar contraseña</Button>
        <Button type="button" variant="quiet" onClick={() => void logout()}>Cerrar sesión</Button>
      </form>
    </main>
  );
}
