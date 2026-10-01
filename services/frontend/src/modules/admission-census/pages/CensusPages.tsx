import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { IconCircleCheck, IconClock } from "@tabler/icons-react";
import { api } from "../../../app/api";
import { ROLE_LABEL } from "../../../app/roles";
import { useAuth } from "../../../app/AuthProvider";
import { isClinicalRole, primaryAttentionPath } from "../../../app/navigation";
import { errorText } from "../../../app/userMessage";
import { BarcodeScanner } from "../../../shared/ui/BarcodeScanner";
import { Button, ButtonLink } from "../../../shared/ui/Button";
import { Panel, StatusPill, type ClinicalTone } from "../../../shared/ui/clinical";
import { TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { LoadingState } from "../../../shared/ui/LoadingState";
import { safeNextPath } from "../../../shared/navigation/returnTo";
import { deliverableCount, locationText, type Encounter } from "../domain/encounter";
import { canActOnEncounter, stepPath } from "../domain/steps";

type CensusMeta = {
  total: number;
  page: number;
  perPage: number;
  lastPage: number;
};

const EMPTY_META: CensusMeta = { total: 0, page: 1, perPage: 10, lastPage: 1 };

function statusTone(statusLabel: string, currentStep: string): ClinicalTone {
  if (currentStep === "cerrado" || /hospitalizado/i.test(statusLabel)) return "success";
  if (/contingencia|reubic/i.test(statusLabel) || currentStep === "reubicacion") return "warning";
  return "warning";
}

function deliverableRatio(encounter: Encounter): { done: number; total: number; label: string } {
  const done = encounter.deliverables.filter((item) => item.done).length;
  const total = encounter.deliverables.length;
  return { done, total, label: `${done}/${total}` };
}

export function CensusPage() {
  const { user } = useAuth();
  const role = user?.role ?? "admision";
  const [searchParams] = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));
  const [encounters, setEncounters] = useState<Encounter[] | null>(null);
  const [meta, setMeta] = useState<CensusMeta>(EMPTY_META);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      per_page: "10",
    });
    if (query) params.set("q", query);

    api<{ encounters: Encounter[]; meta: CensusMeta }>(`/api/v1/hospital-admission/encounters?${params}`)
      .then((data) => {
        if (!active) return;
        setEncounters(data.encounters);
        setMeta(data.meta ?? EMPTY_META);
        setError("");
      })
      .catch((caught) => {
        if (active) setError(errorText(caught, "No se pudo cargar el censo."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [page, query]);

  const applySearch = useCallback(() => {
    setQuery(search.trim());
    setPage(1);
  }, [search]);

  const onWristbandScan = useCallback((code: string) => {
    const trimmed = code.trim();
    if (!trimmed) return;
    setSearch(trimmed);
    setQuery(trimmed);
    setPage(1);
  }, []);

  const mine = encounters?.filter((item) => canActOnEncounter(role, item)) ?? [];
  const from = meta.total === 0 ? 0 : (meta.page - 1) * meta.perPage + 1;
  const to = Math.min(meta.page * meta.perPage, meta.total);

  return (
    <Sheet kicker="Listado" title="Pacientes" wide clinic="board">
      <p className="lead">
        Su turno muestra los casos que esperan a {ROLE_LABEL[role]}. Abra Continuar para trabajar solo ese paciente, o Atención si el ingreso ya está cerrado.
      </p>
      {role === "admision" ? (
        <p className="home-actions"><ButtonLink to="/pacientes/nuevo" variant="quiet">Registrar ingreso</ButtonLink></p>
      ) : null}
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {loading && !encounters ? <LoadingState label="Cargando pacientes…" /> : null}
      <div className="sheet-surface census-sheet">
            <div className="census-toolbar">
              <div className="census-toolbar-row">
                <TextField
                  id="census-search"
                  label="Buscar paciente"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      applySearch();
                    }
                  }}
                  placeholder="Nombre, DNI, orden o brazalete"
                  hint="Escriba el criterio y pulse Buscar. También puede escanear el brazalete."
                />
                <div className="census-toolbar-actions">
                  <Button type="button" variant="primary" onClick={applySearch} disabled={loading}>
                    Buscar
                  </Button>
                  <BarcodeScanner onScan={onWristbandScan} />
                </div>
              </div>
            </div>
      {encounters && mine.length === 0 && meta.total > 0 ? (
        <Feedback tone="info">No hay pacientes esperando su turno en esta página. Use la búsqueda o cambie de página.</Feedback>
      ) : null}
      {encounters && meta.total === 0 ? (
        <Feedback tone="info">
          {query
            ? "No hay pacientes que coincidan con la búsqueda."
            : "No hay pacientes esperando su turno. Aparecerán cuando el paso anterior se registre."}
        </Feedback>
      ) : null}
      {encounters && meta.total > 0 ? (
        <>
            <div className="census-table-bar">
              <span>Pacientes ({from}–{to} de {meta.total})</span>
              <span>Ordenado por prioridad de turno</span>
            </div>
            <table aria-label={`Pacientes (${from}–${to} de ${meta.total})`}>
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
                  const own = canActOnEncounter(role, item);
                  const canAttend = isClinicalRole(role) && item.currentStep === "cerrado";
                  const ratio = deliverableRatio(item);
                  return (
                    <tr key={item.encounterId}>
                      <td>
                        <Link className="census-patient-name" to={`/pacientes/${item.encounterId}`}>{item.patientName}</Link>
                        <span className="census-patient-meta">
                          <span>{item.documentType} {item.documentNumber}</span>
                          <StatusPill tone={statusTone(item.statusLabel, item.currentStep)}>{item.statusLabel}</StatusPill>
                        </span>
                      </td>
                      <td>
                        <strong className="census-step">{item.currentStepLabel}</strong>
                      </td>
                      <td>{locationText(item)}</td>
                      <td>
                        <StatusPill tone={ratio.done === ratio.total && ratio.total > 0 ? "info" : "neutral"}>
                          {ratio.label}
                        </StatusPill>
                        <span className="sr-only">{deliverableCount(item)}</span>
                      </td>
                      <td className="col-action">
                        {own ? (
                          <ButtonLink to={stepPath(item.currentStep, item.encounterId)} variant="quiet">
                            Continuar
                          </ButtonLink>
                        ) : canAttend ? (
                          <ButtonLink to={primaryAttentionPath(role, item.encounterId, nextPath)}>
                            Atención
                          </ButtonLink>
                        ) : (
                          <span>{item.nextRole ? `En curso con ${ROLE_LABEL[item.nextRole]}` : item.statusLabel}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          <nav className="pagination" aria-label="Paginación del censo">
            <p role="status">
              Página {meta.page} de {meta.lastPage}
            </p>
            {meta.lastPage > 1 ? (
              <div className="pager-actions">
                <Button
                  variant="quiet"
                  type="button"
                  disabled={meta.page <= 1 || loading}
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                >
                  Anterior
                </Button>
                <Button
                  variant="quiet"
                  type="button"
                  disabled={meta.page >= meta.lastPage || loading}
                  onClick={() => setPage((current) => current + 1)}
                >
                  Siguiente
                </Button>
              </div>
            ) : null}
          </nav>
        </>
      ) : null}
      </div>
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
    sessionStorage.setItem("vitalsy-ingreso", encounterId);
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
      <Sheet kicker="Ingreso" title="Ficha del ingreso" clinic="file">
        <Feedback tone="error">{error}</Feedback>
      </Sheet>
    );
  }
  if (!encounter) return <LoadingState label="Cargando ficha del ingreso…" />;

  const own = canActOnEncounter(role, encounter);
  const canAttend = isClinicalRole(role) && encounter.currentStep === "cerrado";
  const ratio = deliverableRatio(encounter);
  const ready = ratio.total > 0 && ratio.done === ratio.total;

  return (
    <Sheet
      kicker="Ficha del ingreso"
      title={`Paciente: ${encounter.patientName}`}
      wide
      framed
      clinic="file"
      aside={
        own ? (
          <ButtonLink to={stepPath(encounter.currentStep, encounter.encounterId)}>
            {encounter.currentStep === "derivacion" ? "Revisar cobertura" : encounter.currentStepLabel}
          </ButtonLink>
        ) : canAttend ? (
          <ButtonLink to={primaryAttentionPath(role, encounter.encounterId)}>
            Abrir atención en piso
          </ButtonLink>
        ) : null
      }
    >
      <p className="lead file-status">
        <StatusPill tone={statusTone(encounter.statusLabel, encounter.currentStep)}>{encounter.statusLabel}</StatusPill>
      </p>
      {!own && !canAttend ? (
        <Feedback tone="info">
          {encounter.nextRole
            ? `El siguiente paso corresponde a ${ROLE_LABEL[encounter.nextRole]}.`
            : encounter.statusLabel}
        </Feedback>
      ) : null}
      <Panel title="Datos administrativos y clínicos del ingreso">
        <dl className="facts facts-rows facts-file">
          <div><dt>Documento</dt><dd>{encounter.documentType} {encounter.documentNumber}</dd></div>
          <div><dt>Orden</dt><dd>{encounter.orderNumber}</dd></div>
          <div><dt>Origen</dt><dd>{encounter.originService}</dd></div>
          <div>
            <dt>Cobertura</dt>
            <dd>
              {encounter.coverage.payer}
              {" · "}
              <span className={encounter.coverage.status === "aprobada" ? "text-success" : undefined}>
                {encounter.coverage.status}
              </span>
            </dd>
          </div>
          <div><dt>Ubicación</dt><dd>{locationText(encounter)}</dd></div>
          <div><dt>Expediente</dt><dd>{encounter.recordId ?? "Aún no aperturado"}</dd></div>
          <div><dt>Brazalete</dt><dd>{encounter.wristbandCode ?? "Aún no emitido"}</dd></div>
          <div>
            <dt>Avance</dt>
            <dd>
              <StatusPill tone={ready ? "success" : "neutral"}>
                {ratio.label} {ready ? "completado" : "en curso"}
              </StatusPill>
              <span className="sr-only">{deliverableCount(encounter)}</span>
            </dd>
          </div>
        </dl>
      </Panel>
      {encounter.coverageReferral ? (
        <Panel title="Derivación de cobertura">
          <section className="referral-status" role="region" aria-label="Estado de la derivación de cobertura">
            <Feedback tone="info">
              Trámite derivado a {encounter.coverageReferral.destinationLabel}. Estado: {encounter.coverageReferral.status}.
            </Feedback>
            <dl className="facts">
              <div><dt>Destino</dt><dd>{encounter.coverageReferral.destinationLabel}</dd></div>
              <div><dt>Estado</dt><dd>{encounter.coverageReferral.status}</dd></div>
              <div><dt>Familiar notificado</dt><dd>{encounter.coverageReferral.relativeName}</dd></div>
              <div><dt>Teléfono</dt><dd>{encounter.coverageReferral.relativePhone ?? "No indicado"}</dd></div>
              {encounter.coverageReferral.note ? (
                <div><dt>Observación</dt><dd>{encounter.coverageReferral.note}</dd></div>
              ) : null}
            </dl>
          </section>
        </Panel>
      ) : encounter.coverage.status !== "aprobada" ? (
        <Feedback tone="info">Aún no hay una derivación registrada para este ingreso.</Feedback>
      ) : null}
      <Panel
        title="Entregables del ingreso"
        aside={`${ratio.done} de ${ratio.total} listos`}
      >
        <ul className="deliverables deliverables-grid">
          {encounter.deliverables.map((item) => (
            <li key={item.id} className={item.done ? "done" : undefined}>
              {item.done ? <IconCircleCheck size={20} stroke={1.75} aria-hidden /> : <IconClock size={20} stroke={1.75} aria-hidden />}
              <span>{item.label}</span>
              <strong>{item.done ? "Listo" : "Pendiente"}</strong>
            </li>
          ))}
        </ul>
      </Panel>
      <p><Link to="/pacientes">Volver al censo</Link></p>
    </Sheet>
  );
}
