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
import { TextField } from "../../../shared/ui/Field";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { LoadingState } from "../../../shared/ui/LoadingState";
import { safeNextPath } from "../../../shared/navigation/returnTo";
import { deliverableCount, locationText, type Encounter } from "../domain/encounter";
import { canActOnEncounter, stepPath } from "../domain/steps";
import { AdmissionStepper } from "../ui/AdmissionStepper";

type CensusMeta = {
  total: number;
  page: number;
  perPage: number;
  lastPage: number;
};

const EMPTY_META: CensusMeta = { total: 0, page: 1, perPage: 10, lastPage: 1 };

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
    const timer = window.setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

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
    <Sheet kicker="Ingreso hospitalario" title="Pacientes en admisión" wide>
      <p className="lead">
        Su turno muestra los casos que esperan a {ROLE_LABEL[role]}. Abra Continuar para trabajar solo ese paciente.
      </p>
      {role === "admision" ? (
        <p><ButtonLink to="/pacientes/nuevo" variant="quiet">Registrar ingreso</ButtonLink></p>
      ) : null}
      <div className="census-toolbar">
        <div className="census-toolbar-row">
          <TextField
            id="census-search"
            label="Buscar paciente"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Nombre, DNI, orden o brazalete"
            hint="Busca por nombre, documento, ID de ingreso, orden o código de brazalete."
          />
          <div className="census-toolbar-actions">
            <BarcodeScanner onScan={onWristbandScan} />
          </div>
        </div>
      </div>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {loading && !encounters ? <LoadingState label="Cargando pacientes…" /> : null}
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
          <div className="table-wrap">
            <table>
              <caption>
                Pacientes en curso de admisión y recepción ({from}–{to} de {meta.total})
              </caption>
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
                  return (
                    <tr key={item.encounterId}>
                      <td>
                        <Link to={`/pacientes/${item.encounterId}`}>{item.patientName}</Link>
                        <span className="hint">{item.documentType} {item.documentNumber}</span>
                      </td>
                      <td>
                        {item.statusLabel}
                        <span className="hint">{item.currentStepLabel}</span>
                      </td>
                      <td>{locationText(item)}</td>
                      <td>{deliverableCount(item)}</td>
                      <td className="col-action">
                        {own ? (
                          <ButtonLink to={stepPath(item.currentStep, item.encounterId)}>
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
          </div>
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
      <Sheet kicker="Ingreso" title="Ficha del ingreso">
        <Feedback tone="error">{error}</Feedback>
      </Sheet>
    );
  }
  if (!encounter) return <LoadingState label="Cargando ficha del ingreso…" />;

  const own = canActOnEncounter(role, encounter);
  const canAttend = isClinicalRole(role) && encounter.currentStep === "cerrado";

  return (
    <Sheet kicker="Ficha del ingreso" title={encounter.patientName}>
      <p className="lead">{encounter.statusLabel}.</p>
      {encounter.progress ? (
        <AdmissionStepper
          steps={encounter.progress}
          role={role}
          encounterId={encounter.encounterId}
          currentStep={encounter.currentStep}
        />
      ) : null}
      {own ? (
        <p>
          <ButtonLink to={stepPath(encounter.currentStep, encounter.encounterId)}>
            {encounter.currentStep === "derivacion" ? "Revisar cobertura" : encounter.currentStepLabel}
          </ButtonLink>
        </p>
      ) : canAttend ? (
        <p>
          <ButtonLink to={primaryAttentionPath(role, encounter.encounterId)}>
            Abrir atención en piso
          </ButtonLink>
        </p>
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
      {encounter.coverageReferral ? (
        <section className="referral-status" role="region" aria-label="Estado de la derivación de cobertura">
          <h3>Derivación de cobertura</h3>
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
      ) : encounter.coverage.status !== "aprobada" ? (
        <Feedback tone="info">Aún no hay una derivación registrada para este ingreso.</Feedback>
      ) : null}
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
