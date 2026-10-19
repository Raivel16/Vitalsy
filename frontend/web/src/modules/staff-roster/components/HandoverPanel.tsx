import { useEffect, useState } from "react";
import { errorText } from "../../../app/userMessage";
import { formatTime } from "../../../shared/datetime/format";
import { Button } from "../../../shared/ui/Button";
import { Panel } from "../../../shared/ui/clinical";
import { LoadingState } from "../../../shared/ui/LoadingState";
import { Feedback } from "../../../shared/ui/Sheet";
import { todayIso } from "../domain/coverage";
import { listHandoverCandidates, previewHandover, signHandover } from "../staffApi";
import type { HandoverCandidate, HandoverSummary } from "../types";

/** RF-81/82: la entrante ve a quién releva ahora, consolida sus pacientes y firma la recepción. */
export function HandoverPanel() {
  const date = todayIso();
  const [candidates, setCandidates] = useState<HandoverCandidate[] | null>(null);
  const [fromId, setFromId] = useState<number | null>(null);
  const [summary, setSummary] = useState<HandoverSummary | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    listHandoverCandidates(date)
      .then((data) => {
        if (active) setCandidates(data);
      })
      .catch((error_) => {
        if (!active) return;
        setCandidates([]);
        setError(errorText(error_, "No se pudo consultar el cambio de turno."));
      });
    return () => {
      active = false;
    };
  }, [date, version]);

  async function consolidate() {
    setNotice("");
    if (fromId === null) {
      setError("Seleccione a la enfermera saliente.");
      return;
    }
    setPending(true);
    try {
      setSummary(await previewHandover(date, fromId));
      setError("");
    } catch (error_) {
      setSummary(null);
      setError(errorText(error_, "No se pudo consolidar el handover."));
    } finally {
      setPending(false);
    }
  }

  async function sign() {
    if (!summary) return;
    setPending(true);
    try {
      await signHandover(summary.fromUserId, date);
      setError("");
      setNotice("Recepción de turno firmada.");
      setSummary(null);
      setFromId(null);
      setVersion((current) => current + 1);
    } catch (error_) {
      setError(errorText(error_, "No se pudo firmar el handover."));
    } finally {
      setPending(false);
    }
  }

  return (
    <Panel title="Entrega de turno">
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {notice ? <Feedback tone="success">{notice}</Feedback> : null}

      {candidates === null ? <LoadingState label="Consultando el cambio de turno…" /> : null}

      {candidates?.length === 0 ? (
        <div className="handover-empty">
          <p><strong>No hay un relevo disponible ahora.</strong></p>
          <p className="hint">
            La entrega solo procede en el cambio de turno (de 1 hora antes a 2 horas después) y cuando la jefatura
            publicó en el rol turnos consecutivos del mismo servicio para usted y la enfermera saliente.
            Consulte con su jefatura si el rol del mes está publicado.
          </p>
        </div>
      ) : null}

      {candidates && candidates.length > 0 ? (
        <>
          <fieldset className="handover-candidates">
            <legend>Enfermera saliente</legend>
            {candidates.map((candidate) => (
              <label key={candidate.userId} className="handover-candidate">
                <input
                  type="radio"
                  name="handover-from"
                  checked={fromId === candidate.userId}
                  onChange={() => {
                    setFromId(candidate.userId);
                    setSummary(null);
                  }}
                />
                <strong>{candidate.name}</strong>
                <small>
                  {candidate.unit} · termina {formatTime(candidate.endsAt)} · {candidate.patients} paciente(s)
                </small>
              </label>
            ))}
          </fieldset>
          <Button type="button" pending={pending} onClick={() => void consolidate()}>Consolidar handover</Button>
        </>
      ) : null}

      {summary ? (
        <div className="ops-suggestion">
          <p className="kicker">Pacientes de {summary.fromName}</p>
          {summary.patients.length === 0 ? (
            <p className="hint">La enfermera saliente no tiene pacientes asignados ese día; no hay nada que recibir.</p>
          ) : (
            <ul className="work-queue">
              {summary.patients.map((patient) => (
                <li key={patient.encounterId} className="work-card">
                  <p><strong>{patient.patientName ?? patient.encounterId}</strong> · NEWS2 {patient.news2 ?? "s/d"}</p>
                  <p className="hint">{patient.pendingDoses} dosis pendientes</p>
                  {patient.alerts.map((alert) => (
                    <p key={alert.id} className="hint">Alerta: {alert.message}</p>
                  ))}
                </li>
              ))}
            </ul>
          )}
          <Button type="button" pending={pending} disabled={summary.patients.length === 0} onClick={() => void sign()}>
            Firmar recepción de turno
          </Button>
        </div>
      ) : null}
    </Panel>
  );
}
