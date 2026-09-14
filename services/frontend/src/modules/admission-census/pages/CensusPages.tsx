import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { IconCircleCheck, IconClock } from "@tabler/icons-react";
import { api } from "../../../app/api";
import { ROLE_LABEL } from "../../../app/roles";
import { useAuth } from "../../../app/AuthProvider";
import { errorText } from "../../../app/userMessage";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { deliverableCount, locationText, type Encounter } from "../domain/encounter";
import { stepPath } from "../domain/steps";

export function CensusPage() {
  const { user } = useAuth();
  const role = user?.role ?? "admision";
  const [encounters, setEncounters] = useState<Encounter[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api<{ encounters: Encounter[] }>("/api/v1/hospital-admission/encounters")
      .then((data) => {
        if (active) setEncounters(data.encounters);
      })
      .catch((caught) => {
        if (active) setError(errorText(caught, "No se pudo cargar el censo."));
      });
    return () => {
      active = false;
    };
  }, []);

  const mine = encounters?.filter((item) => item.nextRole === role) ?? [];

  return (
    <Sheet kicker="Ingreso hospitalario" title="Pacientes en admisión">
      <p className="lead">
        Censo del proceso 1. Su turno muestra los casos que esperan a {ROLE_LABEL[role]}. El resto sigue en otro tramo.
      </p>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {!encounters && !error ? <p role="status">Cargando pacientes.</p> : null}
      {encounters && mine.length === 0 ? (
        <Feedback tone="info">No hay pacientes esperando su tramo. Aparecerán cuando el paso anterior se confirme.</Feedback>
      ) : null}
      {encounters ? (
        <div className="table-wrap">
          <table>
            <caption>Pacientes en curso de admisión y recepción</caption>
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Paso vigente</th>
                <th>Ubicación</th>
                <th>Entregables</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {encounters.map((item) => {
                const own = item.nextRole === role || (role === "admision" && item.currentStep === "derivacion");
                return (
                  <tr key={item.encounterId}>
                    <td>
                      <Link to={`/pacientes/${item.encounterId}`}>{item.patientName}</Link>
                      <span className="hint">{item.documentType} {item.documentNumber}</span>
                    </td>
                    <td>
                      {item.subprocess} · {item.statusLabel}
                      <span className="hint">{item.currentStepLabel}</span>
                    </td>
                    <td>{locationText(item)}</td>
                    <td>{deliverableCount(item)}</td>
                    <td>
                      {own ? (
                        <Link className="button" to={stepPath(item.currentStep, item.encounterId)}>
                          Continuar
                        </Link>
                      ) : (
                        <span>{item.nextRole ? `En curso con ${ROLE_LABEL[item.nextRole]}` : item.statusLabel}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </Sheet>
  );
}

export function EncounterFilePage() {
  const { encounterId = "" } = useParams();
  const { user } = useAuth();
  const role = user?.role ?? "admision";
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api<{ encounter: Encounter }>(`/api/v1/hospital-admission/encounters/${encodeURIComponent(encounterId)}`)
      .then((data) => {
        if (active) setEncounter(data.encounter);
      })
      .catch((caught) => {
        if (active) setError(errorText(caught, "No se pudo abrir la ficha."));
      });
    return () => {
      active = false;
    };
  }, [encounterId]);

  if (error) {
    return (
      <Sheet kicker="Ingreso" title="Ficha del ingreso">
        <Feedback tone="error">{error}</Feedback>
      </Sheet>
    );
  }
  if (!encounter) return <p role="status">Cargando ficha del ingreso.</p>;

  const own = encounter.nextRole === role || (role === "admision" && encounter.currentStep === "derivacion");

  return (
    <Sheet kicker={`Subproceso ${encounter.subprocess}`} title={encounter.patientName}>
      <p className="lead">{encounter.subprocessLabel}. {encounter.statusLabel}.</p>
      {own ? (
        <p><Link className="button" to={stepPath(encounter.currentStep, encounter.encounterId)}>{encounter.currentStep === "derivacion" ? "Revisar cobertura" : encounter.currentStepLabel}</Link></p>
      ) : (
        <Feedback tone="info">
          {encounter.nextRole
            ? `Este paso corresponde a ${ROLE_LABEL[encounter.nextRole]}.`
            : encounter.statusLabel}
        </Feedback>
      )}
      <dl className="facts">
        <div><dt>Documento</dt><dd>{encounter.documentType} {encounter.documentNumber}</dd></div>
        <div><dt>Orden</dt><dd>{encounter.orderNumber}</dd></div>
        <div><dt>Origen</dt><dd>{encounter.originService}</dd></div>
        <div><dt>Cobertura</dt><dd>{encounter.coverage.payer} · {encounter.coverage.status}</dd></div>
        <div><dt>Ubicación</dt><dd>{locationText(encounter)}</dd></div>
        <div><dt>Expediente</dt><dd>{encounter.recordId ?? "Aún no aperturado"}</dd></div>
        <div><dt>Brazalete</dt><dd>{encounter.wristbandCode ?? "Aún no emitido"}</dd></div>
        <div><dt>Avance</dt><dd>{deliverableCount(encounter)}</dd></div>
      </dl>
      <h3>Entregables del ingreso</h3>
      <ul className="deliverables">
        {encounter.deliverables.map((item) => (
          <li key={item.id} className={item.done ? "done" : undefined}>
            {item.done ? <IconCircleCheck size={20} stroke={1.75} aria-hidden /> : <IconClock size={20} stroke={1.75} aria-hidden />}
            <span>{item.label}</span>
            <strong>{item.done ? "Listo" : "Pendiente"}</strong>
          </li>
        ))}
      </ul>
      <p><Link to="/pacientes">Volver al censo</Link></p>
    </Sheet>
  );
}
