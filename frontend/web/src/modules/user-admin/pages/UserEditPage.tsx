import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { errorText } from "../../../app/userMessage";
import { Button, ButtonLink } from "../../../shared/ui/Button";
import { Panel, StatusPill } from "../../../shared/ui/clinical";
import { LoadingState } from "../../../shared/ui/LoadingState";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { UserForm } from "../components/UserForm";
import { statusLabel } from "../domain/userForm";
import type { UserAccount } from "../types";
import { deactivateUser, listUsers, updateUser } from "../userApi";

export function UserEditPage() {
  const { userId } = useParams();
  const [account, setAccount] = useState<UserAccount | null>(null);
  const [missing, setMissing] = useState(false);
  const [pending, setPending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    listUsers("", "all")
      .then((data) => {
        if (!active) return;
        const found = data.data.find((item) => String(item.id) === userId);
        if (found) setAccount(found);
        else setMissing(true);
      })
      .catch((error_) => {
        if (active) setError(errorText(error_, "No se pudo cargar la cuenta."));
      });
    return () => {
      active = false;
    };
  }, [userId]);

  async function save(values: { name: string; email: string; role: string }) {
    if (!account) return;
    setPending(true);
    setError("");
    setNotice("");
    try {
      const result = await updateUser(account.id, values);
      setAccount(result.user);
      setNotice("Cambios guardados.");
    } catch (error_) {
      setError(errorText(error_, "No se pudieron guardar los cambios."));
    } finally {
      setPending(false);
    }
  }

  async function deactivate() {
    if (!account) return;
    setPending(true);
    setError("");
    try {
      const result = await deactivateUser(account.id);
      setAccount(result.user);
      setConfirming(false);
      setNotice("Cuenta desactivada. La persona ya no puede iniciar sesión.");
    } catch (error_) {
      setError(errorText(error_, "No se pudo desactivar la cuenta."));
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet kicker="Administración" title="Editar usuario" clinic="form" aside={<ButtonLink to="/usuarios" variant="quiet">Volver</ButtonLink>}>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {notice ? <Feedback tone="success">{notice}</Feedback> : null}
      {missing ? <Feedback tone="error">No se encontró la cuenta solicitada.</Feedback> : null}
      {!account && !missing && !error ? <LoadingState label="Cargando cuenta…" /> : null}
      {account ? (
        <>
          <p>
            <StatusPill tone={account.isActive ? "success" : "neutral"}>{statusLabel(account.isActive)}</StatusPill>
          </p>
          <UserForm
            key={`${account.id}-${account.name}-${account.email}-${account.role}`}
            initial={{ name: account.name, email: account.email, role: account.role }}
            submitLabel="Guardar cambios"
            pending={pending}
            onSubmit={(v) => void save(v)}
          />
          {account.isActive ? (
            <Panel title="Desactivación">
              <p className="hint">La cuenta se conserva para auditoría; solo se bloquea el acceso.</p>
              {confirming ? (
                <div role="alertdialog" aria-label="Confirmar desactivación" className="banner banner-warning">
                  <p>¿Desactivar la cuenta de {account.name}? Se cerrarán sus sesiones activas.</p>
                  <div className="actions">
                    <Button type="button" pending={pending} onClick={() => void deactivate()}>Confirmar desactivación</Button>
                    <Button type="button" variant="quiet" onClick={() => setConfirming(false)}>Cancelar</Button>
                  </div>
                </div>
              ) : (
                <Button type="button" variant="quiet" onClick={() => setConfirming(true)}>Desactivar cuenta</Button>
              )}
            </Panel>
          ) : null}
        </>
      ) : null}
    </Sheet>
  );
}
