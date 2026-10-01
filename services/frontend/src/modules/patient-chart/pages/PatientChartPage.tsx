import { useEffect, useId, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { api } from "../../../app/api";
import { useAuth } from "../../../app/AuthProvider";
import { errorText } from "../../../app/userMessage";
import { EmptyEncounter } from "../../../shared/ui/EmptyEncounter";
import { Feedback, Sheet } from "../../../shared/ui/Sheet";
import { LoadingState } from "../../../shared/ui/LoadingState";
import { DateRangeFilter, DaySection } from "../../../shared/ui/DateRangeFilter";
import { formatDate, formatDateTime, formatTime } from "../../../shared/datetime/format";
import {
  groupByDay,
  rangeQuery,
  resolveDateRange,
  type DateRangeValue,
} from "../../../shared/datetime/range";
import { VitalSignsChartPanel } from "../../vital-monitoring/ui/VitalSignsChartPanel";
import { eventLabel, STATUS_LABEL, type AlertStatus } from "../../clinical-alerts/domain/alert";

type ChartPayload = {
  encounter: {
    patientName: string;
    documentType: string;
    documentNumber: string;
    recordId: string | null;
    wristbandCode: string | null;
    room: string | null;
    bed: string | null;
    service: string | null;
    coveragePayer: string | null;
    coverageStatus: string | null;
    createdAt: string | null;
  };
  admission?: {
    deliverables?: unknown;
    assessment?: { chiefComplaint?: string; allergies?: string[]; history?: string } | null;
    vitalsBasal?: { summary?: string; news2Label?: string; news2Total?: number } | null;
    reconciliation?: { medications?: Array<{ name?: string; dose?: string; frequency?: string }>; noHomeMeds?: boolean } | null;
    risks?: {
      fallRisk?: string;
      pressureRisk?: string;
      morse?: { levelLabel?: string; total?: number };
      braden?: { levelLabel?: string; total?: number };
    } | null;
    medicalOrders?: { statusLabel?: string; items?: string[]; signature?: { physicianName?: string } } | null;
    consent?: { signerName?: string } | null;
    kardexMedications?: string[];
  };
  activePrescription: {
    signedAt: string | null;
    items: { drugName: string; dose: string; route: string; frequency: string; drugBarcode?: string }[];
  } | null;
  vitalSigns: { recordedAt: string | null; pulse: number | null; news2: number | null; respiratoryRate: number | null; oxygenSaturation: number | null }[];
  labResults: { id: number; summary: string; resultedAt: string | null }[];
  imagingReports: { id: number; modality: string | null; summary: string; reportedAt: string | null }[];
  medicalEvolutionNotes: { id: number; body: string; authoredAt: string | null; authorName: string | null }[];
  nursingEvolutionNotes: { id: number; body: string; authoredAt: string | null; authorName: string | null }[];
  careActivities: { id: number; activityLabel: string; completedAt: string | null; completedByName: string | null }[];
  medicationAdministrations: { id: number; drugName: string | null; dose: string | null; status: string; scheduledAt: string | null; administeredAt: string | null }[];
  clinicalAlerts?: {
    id: number;
    status: string;
    severity: string;
    news2Total: number | null;
    message: string;
    source: string;
    generatedAt: string | null;
    closedAt: string | null;
    events: { id: number; type: string; detail: string | null; role: string | null; occurredAt: string | null }[];
  }[];
};

type ChartTab = "admision" | "constantes" | "tratamiento" | "paraclinicos" | "evoluciones" | "alertas";

const TABS: { id: ChartTab; label: string }[] = [
  { id: "admision", label: "Admisión" },
  { id: "constantes", label: "Constantes" },
  { id: "tratamiento", label: "Tratamiento" },
  { id: "paraclinicos", label: "Paraclínicos" },
  { id: "evoluciones", label: "Evoluciones" },
  { id: "alertas", label: "Alertas" },
];

function hasAdmissionContent(admission: ChartPayload["admission"]): boolean {
  if (!admission) return false;
  return Boolean(
    admission.assessment
    || admission.vitalsBasal
    || admission.reconciliation
    || admission.risks
    || admission.medicalOrders
    || admission.consent
    || (admission.kardexMedications && admission.kardexMedications.length > 0),
  );
}

function cleanRiskLabel(value?: string | null): string {
  if (!value) return "—";
  return value
    .replace(/\s+de caídas(?=\s+de caídas)/gi, "")
    .replace(/\s+de úlceras por presión(?=\s+de úlceras)/gi, "")
    .replace(/\s+de caída:(?=\s+de caída:)/gi, "")
    .replace(/\s+de úlcera por presión:(?=\s+de úlcera)/gi, "")
    .trim();
}

export function PatientChartPage() {
  const [params] = useSearchParams();
  const ingreso = params.get("ingreso");
  const { user } = useAuth();
  const tabsId = useId();
  const [data, setData] = useState<ChartPayload | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<ChartTab>("admision");
  const [range, setRange] = useState<DateRangeValue>(() => resolveDateRange("30d"));
  const canRegisterEvolution = user?.role === "medico_residente" || user?.role === "medico_tratante";

  useEffect(() => {
    if (!ingreso) return;
    let active = true;
    const qs = rangeQuery(range);
    api<ChartPayload>(`/api/v1/inpatient-care/encounters/${encodeURIComponent(ingreso)}/clinical-chart${qs}`)
      .then((payload) => {
        if (active) setData(payload);
      })
      .catch((caught) => {
        if (active) setError(errorText(caught, "No se pudo abrir el expediente clínico."));
      });
    return () => {
      active = false;
    };
  }, [ingreso, range.from, range.to, range.preset]);

  if (!ingreso) {
    return (
      <Sheet kicker="Atención en piso" title="Expediente clínico">
        <EmptyEncounter message="Abra un paciente hospitalizado para consultar su expediente clínico." />
      </Sheet>
    );
  }

  if (error) {
    return (
      <Sheet kicker="Atención en piso" title="Expediente clínico">
        <Feedback tone="error">{error}</Feedback>
      </Sheet>
    );
  }

  if (!data) {
    return <LoadingState label="Cargando expediente clínico…" />;
  }

  const { encounter: patient, admission } = data;
  const vitalGroups = groupByDay(data.vitalSigns, (row) => row.recordedAt, formatDate);
  const adminGroups = groupByDay(data.medicationAdministrations, (row) => row.scheduledAt ?? row.administeredAt, formatDate);
  const medicalGroups = groupByDay(data.medicalEvolutionNotes, (row) => row.authoredAt, formatDate);
  const nursingGroups = groupByDay(data.nursingEvolutionNotes, (row) => row.authoredAt, formatDate);
  const careGroups = groupByDay(data.careActivities ?? [], (row) => row.completedAt, formatDate);
  const labGroups = groupByDay(data.labResults, (row) => row.resultedAt, formatDate);
  const imagingGroups = groupByDay(data.imagingReports, (row) => row.reportedAt, formatDate);
  const showRangeFilter = tab !== "admision";

  return (
    <Sheet kicker="Atención en piso" title="Expediente clínico" wide>
      <p className="lead">
        Historial de {patient.patientName} desde el ingreso hospitalario. Solo lectura.
      </p>
      <div className="sheet-surface">
      <dl className="facts">
        <div><dt>Documento</dt><dd>{patient.documentType} {patient.documentNumber}</dd></div>
        <div><dt>Expediente</dt><dd>{patient.recordId ?? "—"}</dd></div>
        <div><dt>Brazalete</dt><dd>{patient.wristbandCode ?? "—"}</dd></div>
        <div><dt>Ubicación</dt><dd>{[patient.service, patient.room, patient.bed].filter(Boolean).join(" · ") || "—"}</dd></div>
        <div><dt>Cobertura</dt><dd>{patient.coveragePayer ?? "—"} · {patient.coverageStatus ?? "—"}</dd></div>
        <div><dt>Ingreso registrado</dt><dd>{formatDateTime(patient.createdAt)}</dd></div>
      </dl>

      <p className="actions">
        <Link to={`/pacientes/${encodeURIComponent(ingreso)}`}>Ficha de admisión</Link>
      </p>

      <div className="chart-tabs" role="tablist" aria-label="Secciones del expediente">
        {TABS.map((item) => {
          const selected = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`${tabsId}-${item.id}`}
              aria-selected={selected}
              aria-controls={`${tabsId}-panel-${item.id}`}
              className={selected ? "chart-tab is-active" : "chart-tab"}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      {showRangeFilter ? (
        <DateRangeFilter value={range} onChange={setRange} label="Filtrar historial del expediente" />
      ) : null}

      {tab === "admision" ? (
        <div
          className="chart-tab-panel"
          role="tabpanel"
          id={`${tabsId}-panel-admision`}
          aria-labelledby={`${tabsId}-admision`}
          aria-label="Admisión"
        >
          <h3>Admisión y recepción</h3>
          {!hasAdmissionContent(admission) ? (
            <Feedback tone="info">Aún no hay registros clínicos de admisión en este expediente.</Feedback>
          ) : (
            <div className="stack">
              {admission?.assessment ? (
                <dl className="facts">
                  <div><dt>Motivo / valoración</dt><dd>{admission.assessment.chiefComplaint ?? "—"}</dd></div>
                  <div><dt>Antecedentes</dt><dd>{admission.assessment.history ?? "—"}</dd></div>
                  <div><dt>Alergias</dt><dd>{(admission.assessment.allergies ?? []).join(", ") || "Ninguna registrada"}</dd></div>
                </dl>
              ) : null}
              {admission?.vitalsBasal ? (
                <p><strong>Constantes basales:</strong> {admission.vitalsBasal.summary ?? "—"} · {admission.vitalsBasal.news2Label ?? `NEWS2 ${admission.vitalsBasal.news2Total ?? "—"}`}</p>
              ) : null}
              {admission?.reconciliation ? (
                <div>
                  <p><strong>Conciliación farmacéutica (BPMH)</strong></p>
                  {(admission.reconciliation.medications ?? []).length === 0 ? (
                    <p className="hint">{admission.reconciliation.noHomeMeds ? "Sin antecedentes farmacológicos." : "Sin medicamentos domiciliarios registrados."}</p>
                  ) : (
                    <div className="table-wrap">
                      <table>
                        <thead><tr><th>Medicamento</th><th>Dosis</th><th>Frecuencia</th></tr></thead>
                        <tbody>
                          {(admission.reconciliation.medications ?? []).map((med, index) => (
                            <tr key={index}>
                              <td>{med.name ?? "—"}</td>
                              <td>{med.dose ?? "—"}</td>
                              <td>{med.frequency ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : null}
              {admission?.risks ? (
                <dl className="facts">
                  <div><dt>Riesgo de caída</dt><dd>{cleanRiskLabel(admission.risks.fallRisk ?? admission.risks.morse?.levelLabel)}</dd></div>
                  <div><dt>Riesgo de úlcera</dt><dd>{cleanRiskLabel(admission.risks.pressureRisk ?? admission.risks.braden?.levelLabel)}</dd></div>
                </dl>
              ) : null}
              {admission?.medicalOrders ? (
                <div>
                  <p><strong>Indicaciones médicas:</strong> {admission.medicalOrders.statusLabel ?? "—"}</p>
                  <ul>
                    {(admission.medicalOrders.items ?? []).map((item) => <li key={item}>{item}</li>)}
                  </ul>
                  {admission.medicalOrders.signature?.physicianName ? (
                    <p className="hint">Firmado por {admission.medicalOrders.signature.physicianName}</p>
                  ) : null}
                </div>
              ) : null}
              {admission?.consent?.signerName ? (
                <p><strong>Consentimiento:</strong> {admission.consent.signerName}</p>
              ) : null}
              {(admission?.kardexMedications ?? []).length > 0 ? (
                <div>
                  <p><strong>Medicamentos de admisión (Kardex)</strong></p>
                  <div className="table-wrap">
                    <table>
                      <tbody>
                        {(admission?.kardexMedications ?? []).map((med) => (
                          <tr key={med}><td>{med}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}

      {tab === "constantes" ? (
        <div
          className="chart-tab-panel"
          role="tabpanel"
          id={`${tabsId}-panel-constantes`}
          aria-labelledby={`${tabsId}-constantes`}
          aria-label="Constantes"
        >
          <VitalSignsChartPanel encounterId={ingreso} range={range} showTable={false} />
          <section className="result-block" aria-label="Lecturas de constantes">
            <h3>Lecturas por fecha</h3>
            {vitalGroups.length === 0 ? (
              <Feedback tone="info">No hay constantes en el rango seleccionado.</Feedback>
            ) : (
              vitalGroups.map((group) => (
                <DaySection key={group.day} label={group.label} count={group.items.length} defaultOpen={false}>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>Hora</th><th>Pulso</th><th>FR</th><th>SpO2</th><th>NEWS2</th></tr>
                      </thead>
                      <tbody>
                        {group.items.map((row, rowIndex) => (
                          <tr key={`${group.day}-${rowIndex}`}>
                            <td>{formatTime(row.recordedAt)}</td>
                            <td>{row.pulse ?? "—"}</td>
                            <td>{row.respiratoryRate ?? "—"}</td>
                            <td>{row.oxygenSaturation ?? "—"}</td>
                            <td>{row.news2 ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </DaySection>
              ))
            )}
          </section>
        </div>
      ) : null}

      {tab === "tratamiento" ? (
        <div
          className="chart-tab-panel"
          role="tabpanel"
          id={`${tabsId}-panel-tratamiento`}
          aria-labelledby={`${tabsId}-tratamiento`}
          aria-label="Tratamiento"
        >
          <section className="result-block" aria-label="Plan CPOE">
            <h3>Plan terapéutico (CPOE)</h3>
            {!data.activePrescription ? <Feedback tone="info">Sin plan activo.</Feedback> : (
              <>
                <p className="hint">Firmado: {formatDateTime(data.activePrescription.signedAt)}</p>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr><th>Medicamento</th><th>Dosis</th><th>Vía</th><th>Frecuencia</th><th>Código</th></tr>
                    </thead>
                    <tbody>
                      {data.activePrescription.items.map((item, index) => (
                        <tr key={index}>
                          <td>{item.drugName}</td>
                          <td>{item.dose}</td>
                          <td>{item.route}</td>
                          <td>{item.frequency}</td>
                          <td><code>{item.drugBarcode ?? "—"}</code></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
          <section className="result-block" aria-label="Administraciones e-MAR">
            <h3>Administraciones e-MAR</h3>
            {adminGroups.length === 0 ? <Feedback tone="info">Sin dosis en el rango seleccionado.</Feedback> : (
              adminGroups.map((group) => (
                <DaySection key={group.day} label={group.label} count={group.items.length} defaultOpen={false}>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>Programada</th><th>Medicamento</th><th>Estado</th><th>Administrada</th></tr>
                      </thead>
                      <tbody>
                        {group.items.map((row) => (
                          <tr key={row.id}>
                            <td>{formatTime(row.scheduledAt)}</td>
                            <td>{row.drugName} {row.dose}</td>
                            <td>{row.status}</td>
                            <td>{formatTime(row.administeredAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </DaySection>
              ))
            )}
          </section>
        </div>
      ) : null}

      {tab === "paraclinicos" ? (
        <div
          className="chart-tab-panel"
          role="tabpanel"
          id={`${tabsId}-panel-paraclinicos`}
          aria-labelledby={`${tabsId}-paraclinicos`}
          aria-label="Paraclínicos"
        >
          <section className="result-block" aria-label="Laboratorio">
            <h3>Laboratorio</h3>
            {labGroups.length === 0 ? <Feedback tone="info">Sin resultados en el rango seleccionado.</Feedback> : (
              labGroups.map((group) => (
                <DaySection key={group.day} label={group.label} count={group.items.length} defaultOpen={false}>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Hora</th><th>Resumen</th></tr></thead>
                      <tbody>
                        {group.items.map((row) => (
                          <tr key={row.id}><td>{formatTime(row.resultedAt)}</td><td>{row.summary}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </DaySection>
              ))
            )}
          </section>
          <section className="result-block" aria-label="Imágenes">
            <h3>Imágenes</h3>
            {imagingGroups.length === 0 ? <Feedback tone="info">Sin informes en el rango seleccionado.</Feedback> : (
              imagingGroups.map((group) => (
                <DaySection key={group.day} label={group.label} count={group.items.length} defaultOpen={false}>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Hora</th><th>Modalidad</th><th>Resumen</th></tr></thead>
                      <tbody>
                        {group.items.map((row) => (
                          <tr key={row.id}>
                            <td>{formatTime(row.reportedAt)}</td>
                            <td>{row.modality ?? "—"}</td>
                            <td>{row.summary}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </DaySection>
              ))
            )}
          </section>
        </div>
      ) : null}

      {tab === "evoluciones" ? (
        <div
          className="chart-tab-panel"
          role="tabpanel"
          id={`${tabsId}-panel-evoluciones`}
          aria-labelledby={`${tabsId}-evoluciones`}
          aria-label="Evoluciones"
        >
          <section className="result-block" aria-label="Evoluciones médicas">
            <h3>Evoluciones médicas</h3>
            {canRegisterEvolution && ingreso ? (
              <p className="actions">
                <Link to={`/atencion/evolucion?ingreso=${encodeURIComponent(ingreso)}`}>
                  Registrar evolución médica
                </Link>
              </p>
            ) : null}
            {medicalGroups.length === 0 ? <Feedback tone="info">Sin notas médicas en el rango seleccionado.</Feedback> : (
              medicalGroups.map((group) => (
                <DaySection key={group.day} label={group.label} count={group.items.length} defaultOpen={false}>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Hora</th><th>Autor</th><th>Nota</th></tr></thead>
                      <tbody>
                        {group.items.map((row) => (
                          <tr key={row.id}>
                            <td>{formatTime(row.authoredAt)}</td>
                            <td>{row.authorName ?? "—"}</td>
                            <td>{row.body}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </DaySection>
              ))
            )}
          </section>
          <section className="result-block" aria-label="Evoluciones de enfermería">
            <h3>Evoluciones de enfermería</h3>
            {nursingGroups.length === 0 ? <Feedback tone="info">Sin notas de enfermería en el rango seleccionado.</Feedback> : (
              nursingGroups.map((group) => (
                <DaySection key={group.day} label={group.label} count={group.items.length} defaultOpen={false}>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Hora</th><th>Autor</th><th>Nota</th></tr></thead>
                      <tbody>
                        {group.items.map((row) => (
                          <tr key={row.id}>
                            <td>{formatTime(row.authoredAt)}</td>
                            <td>{row.authorName ?? "—"}</td>
                            <td>{row.body}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </DaySection>
              ))
            )}
          </section>
          <section className="result-block" aria-label="Cuidados directos">
            <h3>Cuidados directos</h3>
            {careGroups.length === 0 ? <Feedback tone="info">Sin actividades en el rango seleccionado.</Feedback> : (
              careGroups.map((group) => (
                <DaySection key={group.day} label={group.label} count={group.items.length} defaultOpen={false}>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Hora</th><th>Registrado por</th><th>Actividad</th></tr></thead>
                      <tbody>
                        {group.items.map((row) => (
                          <tr key={row.id}>
                            <td>{formatTime(row.completedAt)}</td>
                            <td>{row.completedByName ?? "—"}</td>
                            <td>{row.activityLabel}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </DaySection>
              ))
            )}
          </section>
        </div>
      ) : null}

      {tab === "alertas" ? (
        <div
          className="chart-tab-panel"
          role="tabpanel"
          id={`${tabsId}-panel-alertas`}
          aria-labelledby={`${tabsId}-alertas`}
          aria-label="Alertas"
        >
          <h3>Alertas y respuesta clínica</h3>
          {(data.clinicalAlerts ?? []).length === 0 ? (
            <Feedback tone="info">Sin alertas clínicas en el rango seleccionado.</Feedback>
          ) : (
            (data.clinicalAlerts ?? []).map((item) => (
              <section key={item.id} className="result-block" aria-label={`Alerta ${item.id}`}>
                <p>
                  <strong>{STATUS_LABEL[item.status as AlertStatus] ?? item.status}</strong>
                  {item.news2Total !== null ? ` · NEWS2 ${item.news2Total}` : ""}
                  {" · "}
                  {formatDateTime(item.generatedAt)}
                </p>
                <p>{item.message}</p>
                <p className="actions">
                  <Link to={`/alertas/${item.id}`}>Abrir el evento</Link>
                </p>
                {item.events.length === 0 ? (
                  <p className="hint">Sin movimientos registrados.</p>
                ) : (
                  <ol className="timeline">
                    {item.events.map((event) => (
                      <li key={event.id}>
                        <p><strong>{eventLabel(event.type)}</strong> · {formatDateTime(event.occurredAt)}</p>
                        {event.detail ? <p>{event.detail}</p> : null}
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            ))
          )}
        </div>
      ) : null}
      </div>
    </Sheet>
  );
}
