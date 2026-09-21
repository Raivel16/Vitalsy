import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router";
import { loginRequest } from "./api";
import { useAuth } from "./AuthProvider";
import { errorText } from "./userMessage";
import { IconLogin } from "@tabler/icons-react";
import { SealIcon } from "../shared/ui/Icons";
import { TextField } from "../shared/ui/Field";
import { Feedback } from "../shared/ui/Sheet";

export function LoginPage() {
  const { notice, setNotice, setUser } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    try {
      const data = await loginRequest(email.trim(), password);
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
          <SealIcon />
          <div>
            <h1>Vitalsy</h1>
            <p>Gestión de atención en hospitalización</p>
          </div>
        </div>
        <h2>Iniciar sesión</h2>
        <p className="lead">Ingrese con su cuenta institucional para continuar.</p>
        {notice ? <Feedback tone="info">{notice}</Feedback> : null}
        <TextField id="email" label="Correo" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} error={errors.email} />
        <TextField id="password" label="Contraseña" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} error={errors.password} />
        {error ? <Feedback tone="error">{error}</Feedback> : null}
        <button className="button" type="submit" disabled={loading}>
          <IconLogin size={18} stroke={1.75} aria-hidden />
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
