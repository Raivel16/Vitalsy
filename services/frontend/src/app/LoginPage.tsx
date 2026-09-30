import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router";
import { IconEye, IconEyeOff, IconLogin } from "@tabler/icons-react";
import { loginRequest } from "./api";
import { useAuth } from "./AuthProvider";
import { errorText } from "./userMessage";
import { Button } from "../shared/ui/Button";
import { SealIcon } from "../shared/ui/Icons";
import { TextField } from "../shared/ui/Field";
import { Feedback } from "../shared/ui/Sheet";
import { alertSiren } from "../shared/audio/alertSiren";

export function LoginPage() {
  const { notice, setNotice, setUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!email.trim()) next.email = "El correo es obligatorio.";
    else if (!email.includes("@")) next.email = "Ingrese un correo válido.";
    if (!password) next.password = "La contraseña es obligatoria.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setLoading(true);
    setError("");
    // RF-53: los navegadores solo permiten audio tras un gesto del usuario;
    // este envío habilita la sirena de alertas de la sesión.
    alertSiren.unlock();
    try {
      const data = await loginRequest(email.trim().toLowerCase(), password);
      setUser(data.user);
      setNotice("");
      navigate("/");
    } catch (caught) {
      setError(errorText(caught, "No se pudo iniciar sesión."));
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
            <p>Gestión de atención en hospitalización</p>
          </div>
        </div>
        <h2>Iniciar sesión</h2>
        <p className="lead">Ingrese con su cuenta institucional para continuar.</p>
        {notice ? <Feedback tone="info">{notice}</Feedback> : null}
        <TextField
          id="email"
          label="Correo"
          type="email"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          inputMode="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errors.email}
        />
        <div className="field">
          <label htmlFor="password">Contraseña</label>
          <div className="password-input">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : undefined}
            />
            <button
              type="button"
              className="password-toggle"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? <IconEyeOff size={20} stroke={1.75} aria-hidden /> : <IconEye size={20} stroke={1.75} aria-hidden />}
            </button>
          </div>
          {errors.password ? <p id="password-error" className="field-error">{errors.password}</p> : null}
        </div>
        {error ? <Feedback tone="error">{error}</Feedback> : null}
        <Button type="submit" pending={loading}>
          <IconLogin size={18} stroke={1.75} aria-hidden />
          {loading ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </main>
  );
}
