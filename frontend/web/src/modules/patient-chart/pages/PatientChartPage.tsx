import { type ReactNode, useEffect, useId, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { IconBellRinging, IconBuildingHospital, IconFlask, IconHeartbeat, IconNotes, IconPill } from "@tabler/icons-react";
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
  isWithinDateRange,
  rangeQuery,
  resolveDateRange,
  type DateRangeValue,
  type DayGroup,
} from "../../../shared/datetime/range";
import { VitalSignsChartPanel } from "../../vital-monitoring/ui/VitalSignsChartPanel";
import { eventLabel, STATUS_LABEL, type AlertStatus } from "../../clinical-alerts/domain/alert";
import { cleanRiskLabel } from "../domain/riskLabel";
import { LifeBaselineMetrics } from "../../admission/components/LifeBaselineMetrics";
import type { LifeBaseline } from "../../admission/domain/lifeBaseline";
import { keyByContent } from "../../../shared/list/rowKeys";

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
    /** RNF-06: el payload clínico no se pudo descifrar; alergias y medicación no están disponibles. */
    unreadable?: boolean;
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
    medicalOrders?: {
      statusLabel?: string;
      items?: Array<string | { title?: string; detail?: string; category?: string }>;
      signature?: { physicianName?: string };
    } | null;
    consent?: { signerName?: string } | null;
    kardexMedications?: string[];
  };
  lifeBaseline?: LifeBaseline | null;
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
    events: { id: number; type: string; detail: string | null; role: string | null; userName?: string | null; occurredAt: string | null }[];
  }[];
};

type ChartTab = "admision" | "constantes" | "tratamiento" | "paraclinicos" | "evoluciones" | "alertas";

const TABS: { id: ChartTab; label: string; icon: typeof IconNotes }[] = [
  { id: "admision", label: "Admisión", icon: IconBuildingHospital },
  { id: "constantes", label: "Constantes", icon: IconHeartbeat },
  { id: "tratamiento", label: "Tratamiento", icon: IconPill },
  { id: "paraclinicos", label: "Paraclínicos", icon: IconFlask },
  { id: "evoluciones", label: "Evoluciones", icon: IconNotes },
  { id: "alertas", label: "Alertas", icon: IconBellRinging },
];

function hasAdmissionContent(admission: ChartPayload["admission"], lifeBaseline?: LifeBaseline | null): boolean {
  if (lifeBaseline && lifeBaseline.metrics.length > 0) return true;
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

type OrderItem = string | { title?: string; detail?: string; category?: string };

function presentOrderItem(item: OrderItem): { key: string; text: string } {
  if (typeof item === "string") {
    return { key: item, text: item };
  }
  const title = item.title?.trim() || "Indicación";
  const extra = [item.category, item.detail].filter((part) => part?.trim()).join(" · ");
  return { key: title, text: extra ? `${title} — ${extra}` : title };
}

type ChartAlert = NonNullable<ChartPayload["clinicalAlerts"]>[number];
type Admission = NonNullable<ChartPayload["admission"]>;

function TabPanel({ tabsId, id, label, children }: Readonly<{ tabsId: string; id: ChartTab; label: string; children: ReactNode }>) {
  return (
    <div
      className="chart-tab-panel"
      role="tabpanel"
      id={`${tabsId}-panel-${id}`}
      aria-labelledby={`${tabsId}-${id}`}
      aria-label={label}
    >
      {children}
    </div>
  );
}

/** Secciones agrupadas por día: lista de días plegables con una tabla por día. */
function DayTable<T>({
  groups,
  empty,
  head,
  rowKey,
  renderRow,
}: Readonly<{
  groups: DayGroup<T>[];
  empty: string;
  head: ReactNode;
  rowKey: (row: T, index: number, day: string) => string | number;
  renderRow: (row: T) => ReactNode;
}>) {
  if (groups.length === 0) return <Feedback tone="info">{empty}</Feedback>;
  return (
    <>
      {groups.map((group) => (
        <DaySection key={group.day} label={group.label} count={group.items.length} defaultOpen={false}>
          <div className="table-wrap">
            <table>
              <thead>{head}</thead>
              <tbody>
                {group.items.map((row, index) => (
                  <tr key={rowKey(row, index, group.day)}>{renderRow(row)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </DaySection>
      ))}
    </>
  );
}

function LifeBaselineBlock({ baseline }: Readonly<{ baseline: LifeBaseline | null | undefined }>) {
  if (!baseline || baseline.metrics.length === 0) {
    return <p className="hint">Aún no hay línea de base importada de Vitalsy Life.</p>;
  }
  return (
    <div>
      <p><strong>Línea de base Vitalsy Life</strong></p>
      <LifeBaselineMetrics metrics={baseline.metrics} />
      {baseline.importedAt ? (
        <p className="hint">Importada el {formatDateTime(baseline.importedAt)}</p>
      ) : null}
    </div>
  );
}

function ReconciliationBlock({ reconciliation }: Readonly<{ reconciliation: NonNullable<Admission["reconciliation"]> }>) {
  const medications = reconciliation.medications ?? [];
  return (
    <div>
      <p><strong>Conciliación farmacéutica (BPMH)</strong></p>
      {medications.length === 0 ? (
        <p className="hint">{reconciliation.noHomeMeds ? "Sin antecedentes farmacológicos." : "Sin medicamentos domiciliarios registrados."}</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Medicamento</th><th>Dosis</th><th>Frecuencia</th></tr></thead>
            <tbody>
              {keyByContent(medications, (med) => `${med.name}|${med.dose}|${med.frequency}`).map(({ key, item: med }) => (
                <tr key={key}>
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
  );
}

function MedicalOrdersBlock({ orders }: Readonly<{ orders: NonNullable<Admission["medicalOrders"]> }>) {
  return (
    <div>
      <p><strong>Indicaciones médicas:</strong> {orders.statusLabel ?? "—"}</p>
      <ul>
        {(orders.items ?? []).map((item, index) => {
          const row = presentOrderItem(item);
          return <li key={`${row.key}-${index}`}>{row.text}</li>;
        })}
      </ul>
      {orders.signature?.physicianName ? (
        <p className="hint">Firmado por {orders.signature.physicianName}</p>
      ) : null}
    </div>
  );
}

function KardexBlock({ medications }: Readonly<{ medications: string[] }>) {
  return (
    <div>
      <p><strong>Medicamentos de admisión (Kardex)</strong></p>
      <div className="table-wrap">
        <table>
          <tbody>
            {medications.map((med) => (
              <tr key={med}><td>{med}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AdmissionDetails({ admission, baseline }: Readonly<{ admission: ChartPayload["admission"]; baseline: LifeBaseline | null | undefined }>) {
  const kardex = admission?.kardexMedications ?? [];
  return (
    <div className="stack">
      <LifeBaselineBlock baseline={baseline} />
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
      {admission?.reconciliation ? <ReconciliationBlock reconciliation={admission.reconciliation} /> : null}
      {admission?.risks ? (
        <dl className="facts">
          <div><dt>Riesgo de caída</dt><dd>{cleanRiskLabel(admission.risks.fallRisk ?? admission.risks.morse?.levelLabel)}</dd></div>
          <div><dt>Riesgo de úlcera</dt><dd>{cleanRiskLabel(admission.risks.pressureRisk ?? admission.risks.braden?.levelLabel)}</dd></div>
        </dl>
      ) : null}
      {admission?.medicalOrders ? <MedicalOrdersBlock orders={admission.medicalOrders} /> : null}
      {admission?.consent?.signerName ? (
        <p><strong>Consentimiento:</strong> {admission.consent.signerName}</p>
      ) : null}
      {kardex.length > 0 ? <KardexBlock medications={kardex} /> : null}
    </div>
  );
}

function AdmissionPanel({ tabsId, data }: Readonly<{ tabsId: string; data: ChartPayload }>) {
  const { admission } = data;
  let content: ReactNode;
  if (admission?.unreadable) {
    content = (
      <Feedback tone="error">No disponible: los datos clínicos de admisión (alergias, medicación y riesgos) no se pudieron leer. No asuma que el paciente no tiene alergias ni medicación; contacte a soporte.</Feedback>
    );
  } else if (hasAdmissionContent(admission, data.lifeBaseline)) {
    content = <AdmissionDetails admission={admission} baseline={data.lifeBaseline} />;
  } else {
    content = <Feedback tone="info">Aún no hay registros clínicos de admisión en este expediente.</Feedback>;
  }
  return (
    <TabPanel tabsId={tabsId} id="admision" label="Admisión">
      <h3>Admisión y recepción</h3>
      {content}
    </TabPanel>
  );
}

function VitalsPanel({
  tabsId,
  ingreso,
  range,
  groups,
}: Readonly<{ tabsId: string; ingreso: string; range: DateRangeValue; groups: DayGroup<ChartPayload["vitalSigns"][number]>[] }>) {
  return (
    <TabPanel tabsId={tabsId} id="constantes" label="Constantes">
      <VitalSignsChartPanel encounterId={ingreso} range={range} showTable={false} />
      <section className="result-block" aria-label="Lecturas de constantes">
        <h3>Lecturas por fecha</h3>
        <DayTable
          groups={groups}
          empty="No hay constantes en el rango seleccionado."
          head={<tr><th>Hora</th><th>Pulso</th><th>FR</th><th>SpO2</th><th>NEWS2</th></tr>}
          rowKey={(_row, index, day) => `${day}-${index}`}
          renderRow={(row) => (
            <>
              <td>{formatTime(row.recordedAt)}</td>
              <td>{row.pulse ?? "—"}</td>
              <td>{row.respiratoryRate ?? "—"}</td>
              <td>{row.oxygenSaturation ?? "—"}</td>
              <td>{row.news2 ?? "—"}</td>
            </>
          )}
        />
      </section>
    </TabPanel>
  );
}

function PrescriptionPlan({ plan }: Readonly<{ plan: ChartPayload["activePrescription"] }>) {
  if (!plan) return <Feedback tone="info">Sin plan activo.</Feedback>;
  return (
    <>
      <p className="hint">Firmado: {formatDateTime(plan.signedAt)}</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Medicamento</th><th>Dosis</th><th>Vía</th><th>Frecuencia</th><th>Código</th></tr>
          </thead>
          <tbody>
            {keyByContent(plan.items, (item) => `${item.drugName}|${item.dose}|${item.route}|${item.frequency}|${item.drugBarcode}`).map(({ key, item }) => (
              <tr key={key}>
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
  );
}

function TreatmentPanel({
  tabsId,
  data,
  groups,
}: Readonly<{ tabsId: string; data: ChartPayload; groups: DayGroup<ChartPayload["medicationAdministrations"][number]>[] }>) {
  return (
    <TabPanel tabsId={tabsId} id="tratamiento" label="Tratamiento">
      <section className="result-block" aria-label="Plan CPOE">
        <h3>Plan terapéutico (CPOE)</h3>
        <PrescriptionPlan plan={data.activePrescription} />
      </section>
      <section className="result-block" aria-label="Administraciones e-MAR">
        <h3>Administraciones e-MAR</h3>
        <DayTable
          groups={groups}
          empty="Sin dosis en el rango seleccionado."
          head={<tr><th>Programada</th><th>Medicamento</th><th>Estado</th><th>Administrada</th></tr>}
          rowKey={(row) => row.id}
          renderRow={(row) => (
            <>
              <td>{formatTime(row.scheduledAt)}</td>
              <td>{row.drugName} {row.dose}</td>
              <td>{row.status}</td>
              <td>{formatTime(row.administeredAt)}</td>
            </>
          )}
        />
      </section>
    </TabPanel>
  );
}

function ParaclinicalPanel({
  tabsId,
  labGroups,
  imagingGroups,
}: Readonly<{
  tabsId: string;
  labGroups: DayGroup<ChartPayload["labResults"][number]>[];
  imagingGroups: DayGroup<ChartPayload["imagingReports"][number]>[];
}>) {
  return (
    <TabPanel tabsId={tabsId} id="paraclinicos" label="Paraclínicos">
      <section className="result-block" aria-label="Laboratorio">
        <h3>Laboratorio</h3>
        <DayTable
          groups={labGroups}
          empty="Sin resultados en el rango seleccionado."
          head={<tr><th>Hora</th><th>Resumen</th></tr>}
          rowKey={(row) => row.id}
          renderRow={(row) => (
            <>
              <td>{formatTime(row.resultedAt)}</td>
              <td>{row.summary}</td>
            </>
          )}
        />
      </section>
      <section className="result-block" aria-label="Imágenes">
        <h3>Imágenes</h3>
        <DayTable
          groups={imagingGroups}
          empty="Sin informes en el rango seleccionado."
          head={<tr><th>Hora</th><th>Modalidad</th><th>Resumen</th></tr>}
          rowKey={(row) => row.id}
          renderRow={(row) => (
            <>
              <td>{formatTime(row.reportedAt)}</td>
              <td>{row.modality ?? "—"}</td>
              <td>{row.summary}</td>
            </>
          )}
        />
      </section>
    </TabPanel>
  );
}

type NoteRow = ChartPayload["medicalEvolutionNotes"][number];

function NoteTable({ groups, empty }: Readonly<{ groups: DayGroup<NoteRow>[]; empty: string }>) {
  return (
    <DayTable
      groups={groups}
      empty={empty}
      head={<tr><th>Hora</th><th>Autor</th><th>Nota</th></tr>}
      rowKey={(row) => row.id}
      renderRow={(row) => (
        <>
          <td>{formatTime(row.authoredAt)}</td>
          <td>{row.authorName ?? "—"}</td>
          <td>{row.body}</td>
        </>
      )}
    />
  );
}

function EvolutionsPanel({
  tabsId,
  ingreso,
  canRegister,
  medicalGroups,
  nursingGroups,
  careGroups,
}: Readonly<{
  tabsId: string;
  ingreso: string;
  canRegister: boolean;
  medicalGroups: DayGroup<NoteRow>[];
  nursingGroups: DayGroup<NoteRow>[];
  careGroups: DayGroup<ChartPayload["careActivities"][number]>[];
}>) {
  return (
    <TabPanel tabsId={tabsId} id="evoluciones" label="Evoluciones">
      <section className="result-block" aria-label="Evoluciones médicas">
        <h3>Evoluciones médicas</h3>
        {canRegister ? (
          <p className="actions">
            <Link to={`/atencion/evolucion?ingreso=${encodeURIComponent(ingreso)}`}>
              Registrar evolución médica
            </Link>
          </p>
        ) : null}
        <NoteTable groups={medicalGroups} empty="Sin notas médicas en el rango seleccionado." />
      </section>
      <section className="result-block" aria-label="Evoluciones de enfermería">
        <h3>Evoluciones de enfermería</h3>
        <NoteTable groups={nursingGroups} empty="Sin notas de enfermería en el rango seleccionado." />
      </section>
      <section className="result-block" aria-label="Cuidados directos">
        <h3>Cuidados directos</h3>
        <DayTable
          groups={careGroups}
          empty="Sin actividades en el rango seleccionado."
          head={<tr><th>Hora</th><th>Registrado por</th><th>Actividad</th></tr>}
          rowKey={(row) => row.id}
          renderRow={(row) => (
            <>
              <td>{formatTime(row.completedAt)}</td>
              <td>{row.completedByName ?? "—"}</td>
              <td>{row.activityLabel}</td>
            </>
          )}
        />
      </section>
    </TabPanel>
  );
}

function AlertCard({ item }: Readonly<{ item: ChartAlert }>) {
  return (
    <section className="result-block" aria-label={`Alerta ${item.id}`}>
      <p>
        <strong>{STATUS_LABEL[item.status as AlertStatus] ?? item.status}</strong>
        {item.news2Total === null ? "" : ` · NEWS2 ${item.news2Total}`}
        {" · Generada "}
        {formatDateTime(item.generatedAt)}
        {item.closedAt ? ` · Cerrada ${formatDateTime(item.closedAt)}` : ""}
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
              {event.userName ? <p className="hint">{event.userName}{event.role ? ` · ${event.role}` : ""}</p> : null}
              {event.detail ? <p>{event.detail}</p> : null}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function AlertsPanel({
  tabsId,
  alerts,
  range,
  onRangeChange,
}: Readonly<{ tabsId: string; alerts: ChartAlert[]; range: DateRangeValue; onRangeChange: (value: DateRangeValue) => void }>) {
  return (
    <TabPanel tabsId={tabsId} id="alertas" label="Alertas">
      <h3>Alertas y respuesta clínica</h3>
      <p className="hint">Incluye las alertas abiertas y las ya atendidas, con la evaluación y las indicaciones que registró el médico.</p>
      <DateRangeFilter value={range} onChange={onRangeChange} label="Filtrar alertas del expediente" />
      {alerts.length === 0 ? (
        <Feedback tone="info">Sin alertas clínicas en el rango seleccionado.</Feedback>
      ) : (
        alerts.map((item) => <AlertCard key={item.id} item={item} />)
      )}
    </TabPanel>
  );
}

function ChartTabs({ tabsId, tab, onSelect }: Readonly<{ tabsId: string; tab: ChartTab; onSelect: (tab: ChartTab) => void }>) {
  return (
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
            onClick={() => onSelect(item.id)}
          >
            <item.icon size={18} stroke={1.75} aria-hidden />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

function useChartPayload(ingreso: string | null, range: DateRangeValue) {
  const [data, setData] = useState<ChartPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ingreso) return;
    let active = true;
    const qs = rangeQuery(range);
    api<ChartPayload>(`/api/v1/inpatient-care/encounters/${encodeURIComponent(ingreso)}/clinical-chart${qs}`)
      .then((payload) => {
        if (active) setData(payload);
      })
      .catch((error_) => {
        if (active) setError(errorText(error_, "No se pudo abrir el expediente clínico."));
      });
    return () => {
      active = false;
    };
  }, [ingreso, range.from, range.to, range.preset]);

  return { data, error };
}

function ChartFrame({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Sheet kicker="Historia clínica hospitalaria" title="Expediente clínico" wide clinic="file" className="floor-care">
      {children}
    </Sheet>
  );
}

function PatientIdentity({ patient }: Readonly<{ patient: ChartPayload["encounter"] }>) {
  return (
    <dl className="facts chart-identity">
      <div><dt>Documento</dt><dd>{patient.documentType} {patient.documentNumber}</dd></div>
      <div><dt>Expediente</dt><dd>{patient.recordId ?? "—"}</dd></div>
      <div><dt>Brazalete</dt><dd>{patient.wristbandCode ?? "—"}</dd></div>
      <div><dt>Ubicación</dt><dd>{[patient.service, patient.room, patient.bed].filter(Boolean).join(" · ") || "—"}</dd></div>
      <div><dt>Cobertura</dt><dd>{patient.coveragePayer ?? "—"} · {patient.coverageStatus ?? "—"}</dd></div>
      <div><dt>Ingreso registrado</dt><dd>{formatDateTime(patient.createdAt)}</dd></div>
    </dl>
  );
}

export function PatientChartPage() {
  const [params] = useSearchParams();
  const ingreso = params.get("ingreso");
  const { user } = useAuth();
  const tabsId = useId();
  const [tab, setTab] = useState<ChartTab>("admision");
  const [range, setRange] = useState<DateRangeValue>(() => resolveDateRange("30d"));
  const [alertRange, setAlertRange] = useState<DateRangeValue>(() => resolveDateRange("todo"));
  const canRegisterEvolution = user?.role === "medico_residente" || user?.role === "medico_tratante";
  const { data, error } = useChartPayload(ingreso, range);

  if (!ingreso) {
    return (
      <ChartFrame>
        <EmptyEncounter message="Abra un paciente hospitalizado para consultar su expediente clínico." />
      </ChartFrame>
    );
  }

  if (error) {
    return (
      <ChartFrame>
        <Feedback tone="error">{error}</Feedback>
      </ChartFrame>
    );
  }

  if (!data) {
    return <LoadingState label="Cargando expediente clínico…" />;
  }

  const showRangeFilter = tab !== "admision" && tab !== "alertas";
  const visibleAlerts = (data.clinicalAlerts ?? []).filter((item) => isWithinDateRange(item.generatedAt, alertRange));

  return (
    <Sheet kicker="Historia clínica hospitalaria" title="Expediente clínico" wide clinic="file" className="floor-care">
      <p className="lead">
        Consolidado de registros clínicos del episodio de hospitalización actual de {data.encounter.patientName}.
      </p>
      <PatientIdentity patient={data.encounter} />

      {canRegisterEvolution ? (
        <p className="actions">
          <Link className="button" to={`/egreso/${encodeURIComponent(ingreso)}`}>Iniciar proceso de alta</Link>
        </p>
      ) : null}

      <ChartTabs tabsId={tabsId} tab={tab} onSelect={setTab} />

      {showRangeFilter ? (
        <DateRangeFilter value={range} onChange={setRange} label="Filtrar historial del expediente" />
      ) : null}

      {tab === "admision" ? <AdmissionPanel tabsId={tabsId} data={data} /> : null}
      {tab === "constantes" ? (
        <VitalsPanel
          tabsId={tabsId}
          ingreso={ingreso}
          range={range}
          groups={groupByDay(data.vitalSigns, (row) => row.recordedAt, formatDate)}
        />
      ) : null}
      {tab === "tratamiento" ? (
        <TreatmentPanel
          tabsId={tabsId}
          data={data}
          groups={groupByDay(data.medicationAdministrations, (row) => row.scheduledAt ?? row.administeredAt, formatDate)}
        />
      ) : null}
      {tab === "paraclinicos" ? (
        <ParaclinicalPanel
          tabsId={tabsId}
          labGroups={groupByDay(data.labResults, (row) => row.resultedAt, formatDate)}
          imagingGroups={groupByDay(data.imagingReports, (row) => row.reportedAt, formatDate)}
        />
      ) : null}
      {tab === "evoluciones" ? (
        <EvolutionsPanel
          tabsId={tabsId}
          ingreso={ingreso}
          canRegister={canRegisterEvolution}
          medicalGroups={groupByDay(data.medicalEvolutionNotes, (row) => row.authoredAt, formatDate)}
          nursingGroups={groupByDay(data.nursingEvolutionNotes, (row) => row.authoredAt, formatDate)}
          careGroups={groupByDay(data.careActivities ?? [], (row) => row.completedAt, formatDate)}
        />
      ) : null}
      {tab === "alertas" ? (
        <AlertsPanel tabsId={tabsId} alerts={visibleAlerts} range={alertRange} onRangeChange={setAlertRange} />
      ) : null}
    </Sheet>
  );
}
