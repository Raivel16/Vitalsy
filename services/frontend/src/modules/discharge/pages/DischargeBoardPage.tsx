import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { api } from "../../../app/api";
import { useAuth } from "../../../app/AuthProvider";
import { errorText } from "../../../app/userMessage";
import { Button } from "../../../shared/ui/Button";
import { TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { LoadingState } from "../../../shared/ui/LoadingState";
import { ACTION_LABEL, type DischargeCase } from "../domain/discharge";

export function DischargeBoardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState<DischargeCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [encounterId, setEncounterId] = useState("");

  const load = useCallback(async () => {
    try {
      const path = user?.role === "camillero" ? "/api/v1/discharge/authorized-exits" : "/api/v1/discharge/board";
      const data = await api<{ cases: DischargeCase[] }>(path);
      setCases(data.cases);
      setError("");
    } catch (caught) {
      setError(errorText(caught, "No se pudo cargar el listado de egresos."));
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingState label="Cargando egresos…" />;

  return (
    <Sheet kicker="Alta y egreso" title="Pacientes en proceso de alta" wide>
      <p className="lead">
        Continúe el entregable que corresponde a su perfil. La valoración social y la conciliación de enfermería pueden
        avanzar en paralelo.
      </p>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          if (!encounterId.trim()) {
            setError("Indique el ingreso que desea abrir.");
            return;
          }
          void navigate(`/egreso/${encodeURIComponent(encounterId.trim())}`);
        }}
      >
        <TextField
          id="discharge-encounter"
          label="Abrir ficha de egreso"
          value={encounterId}
          onChange={(event) => setEncounterId(event.target.value)}
        />
        <Button type="submit">Abrir ficha</Button>
      </form>
      {cases.length === 0 ? (
        <Feedback tone="info">No hay egresos pendientes para su perfil.</Feedback>
      ) : (
        <ul className="work-queue">
          {cases.map((item) => (
            <li key={item.encounterId} className="work-card">
              <h3>{item.patientName}</h3>
              <p className="hint">{item.location ?? "Ubicación no registrada"}</p>
              <p>{item.nextAction ? ACTION_LABEL[item.nextAction] ?? item.nextAction : "Egreso en curso"}</p>
              <p>
                {item.deliverables.filter((deliverable) => deliverable.done).length} de {item.deliverables.length} entregables listos
              </p>
              <Button type="button" onClick={() => void navigate(`/egreso/${item.encounterId}`)}>
                Continuar
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
