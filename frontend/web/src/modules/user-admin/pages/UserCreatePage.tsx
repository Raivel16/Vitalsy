import { useEffect, useState } from "react";
import { errorText } from "../../../app/userMessage";
import { Button, ButtonLink } from "../../../shared/ui/Button";
import { Panel } from "../../../shared/ui/clinical";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { UserForm } from "../components/UserForm";
import { createUser } from "../userApi";

const PASSWORD_VISIBLE_MS = 60_000;

export function UserCreatePage() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [expired, setExpired] = useState(false);

  // La contraseña temporal no debe quedar visible indefinidamente en pantalla.
  useEffect(() => {
    if (!created) return;
    const timer = window.setTimeout(() => {
      setCreated((current) => (current ? { ...current, password: "" } : current));
      setExpired(true);
    }, PASSWORD_VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [created]);

  async function submit(values: { name: string; email: string; role: string }) {
    setPending(true);
    setError("");
    try {
      const result = await createUser(values);
      setCreated({ email: result.user.email, password: result.temporaryPassword });
    } catch (caught) {
      setError(errorText(caught, "No se pudo crear la cuenta."));
    } finally {
      setPending(false);
    }
  }

  async function copy(password: string) {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Sheet kicker="Administración" title="Registrar usuario" clinic="form">
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {created ? (
        <Panel title="Contraseña temporal">
          <Feedback tone="success">Cuenta creada para {created.email}. Entregue la contraseña temporal; no se vuelve a mostrar.</Feedback>
          {expired ? (
            <p className="hint">La contraseña temporal ya no se muestra. Si se perdió, comuníquelo al administrador de accesos.</p>
          ) : (
            <p><code className="temp-password">{created.password}</code></p>
          )}
          <div className="actions">
            <Button type="button" variant="quiet" disabled={expired} onClick={() => void copy(created.password)}>
              {copied ? "Copiada" : "Copiar contraseña"}
            </Button>
            <ButtonLink to="/usuarios">Volver al listado</ButtonLink>
          </div>
        </Panel>
      ) : (
        <UserForm initial={{ name: "", email: "", role: "" }} submitLabel="Crear cuenta" pending={pending} onSubmit={(v) => void submit(v)} />
      )}
    </Sheet>
  );
}
