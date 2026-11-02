import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { ROLE_LABEL, type Role } from "./roles";
import { useAuth } from "./AuthProvider";
import { api } from "./api";
import {
  canOpenPatientWorklist,
  isAlertRole,
  isBedRole,
  isClinicalRole,
  isDischargeRole,
  isAdminRole,
  isStaffRole,
} from "./navigation";
import { ButtonLink } from "../shared/ui/Button";
import { Panel, QueueRow, StatTile, type ClinicalTone } from "../shared/ui/clinical";
import type { ClinicalAlert } from "../modules/clinical-alerts/domain/alert";
import { ALERT_INBOX_CHANGED_EVENT } from "../modules/clinical-alerts/domain/inboxEvents";

const GUIDE: Record<Role, string> = {
  admision: "Abra el censo, continúe el paciente de su turno y registre cada actividad. También puede registrar un ingreso manual o recibir órdenes por la API de intake.",
  camillero: "Abra el censo y continúe solo los pacientes listos para traslado. Consulte habitación y lecho, y verifique el brazalete antes de movilizar.",
  enfermera_piso: "Abra Pacientes, elija un hospitalizado y use Atención en piso (e-MAR, constantes y cuidados). El menú lateral abre cada pantalla del turno.",
  auxiliar_enfermeria: "Abra Pacientes, elija un hospitalizado y registre constantes o cuidados desde Atención en piso.",
  medico_residente: "Abra Pacientes, elija un hospitalizado y use Visita médica, laboratorio, imágenes o evolución desde el menú Atención en piso.",
  medico_tratante: "Abra Pacientes: firme indicaciones de admisión si corresponden, o use Visita médica, laboratorio, imágenes, evolución y CPOE en Atención en piso.",
  enfermera_supervisora: "Supervise el piso: atenderá los escalamientos de alertas, las proyecciones de alta y la asignación diaria del personal.",
  equipo_respuesta_rapida: "Atienda las intervenciones especializadas: registrará la evaluación del paciente y la orden de traslado a cuidados intensivos.",
  trabajo_social: "Registre la valoración social previa al egreso de los pacientes con orden de alta.",
  altas_caja: "Verifique la cuenta hospitalaria y emita el pase de salida de los pacientes con alta autorizada.",
  gestion_camas: "Reciba las solicitudes de cama, consulte el censo de lechos y confirme las asignaciones.",
  servicios_generales: "Reciba las órdenes de limpieza terminal y registre la desinfección de cada unidad.",
  jefatura_enfermeria: "Publique el rol mensual de turnos y apruebe las convocatorias de personal de retén.",
  recursos_humanos: "Valide las justificaciones y autorice las coberturas extraordinarias del personal asistencial.",
  administrador_accesos: "Cree cuentas, asigne el rol de cada persona y desactive los accesos que ya no corresponden.",
};

const CONTROL_ROLES: ReadonlySet<Role> = new Set<Role>(["enfermera_piso", "auxiliar_enfermeria", "enfermera_supervisora"]);

type ControlRow = {
  encounterId: string;
  patientName: string;
  location: string | null;
  overdue: boolean;
};

type QueueItem = {
  key: string;
  name: string;
  meta: string;
  tone: ClinicalTone;
  chip: string;
  action: { to: string; label: string };
  actionTone: "primary" | "quiet" | "danger";
};

function area(role: Role): { kicker: string; title: string } {
  if (isClinicalRole(role)) {
    return { kicker: "Atención hospitalaria", title: "Inicio" };
  }
  if (role === "admision" || role === "camillero") {
    return { kicker: "Ingreso hospitalario", title: "Admisión y recepción del paciente" };
  }
  return { kicker: "Apoyo hospitalario", title: "Coordinación y soporte asistencial" };
}

function softFail<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return promise.catch(() => fallback);
}

type HomeTask = { to: string; label: string; hint: string };

function bedsPath(role: Role): string {
  return role === "servicios_generales" || role === "auxiliar_enfermeria" ? "/camas/limpieza" : "/camas";
}

function homeTasks(role: Role): HomeTask[] {
  const tasks: Array<HomeTask | null> = [
    canOpenPatientWorklist(role) ? { to: "/pacientes", label: "Ver pacientes en curso", hint: "Cola del turno" } : null,
    role === "admision" ? { to: "/pacientes/nuevo", label: "Registrar un ingreso manual", hint: "Ingreso sin orden previa" } : null,
    isDischargeRole(role) ? { to: "/egreso", label: "Abrir altas y egresos", hint: "Pacientes en proceso de alta" } : null,
    isBedRole(role) ? { to: bedsPath(role), label: "Abrir gestión de camas", hint: "Censo y habilitación" } : null,
    isAdminRole(role) ? { to: "/usuarios", label: "Abrir administración de usuarios", hint: "Cuentas, roles y accesos" } : null,
    isStaffRole(role) ? { to: "/personal", label: "Abrir turnos y cobertura", hint: "Rol y asignación del día" } : null,
  ];
  return tasks.filter((item): item is HomeTask => item !== null);
}

function loadPatientTotal(role: Role): Promise<number | null> {
  if (!canOpenPatientWorklist(role)) return Promise.resolve(null);
  return softFail(
    api<{ meta: { total: number } }>("/api/v1/hospital-admission/encounters?page=1&per_page=1").then((data) => data.meta.total),
    null,
  );
}

function loadOverdueControls(role: Role): Promise<ControlRow[]> {
  if (!CONTROL_ROLES.has(role)) return Promise.resolve([]);
  return softFail(
    api<{ controls: ControlRow[] }>("/api/v1/inpatient-care/monitoring-controls").then((data) =>
      data.controls.filter((row) => row.overdue),
    ),
    [],
  );
}

function loadAlerts(role: Role): Promise<ClinicalAlert[]> {
  if (!isAlertRole(role)) return Promise.resolve([]);
  return softFail(api<{ alerts: ClinicalAlert[] }>("/api/v1/clinical-alerts/inbox").then((data) => data.alerts), []);
}

function useHomeData(role: Role) {
  const [patientTotal, setPatientTotal] = useState<number | null>(null);
  const [overdueControls, setOverdueControls] = useState<ControlRow[]>([]);
  const [alerts, setAlerts] = useState<ClinicalAlert[]>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [patients, controls, inbox] = await Promise.all([
        loadPatientTotal(role),
        loadOverdueControls(role),
        loadAlerts(role),
      ]);
      if (!active) return;
      setPatientTotal(patients);
      setOverdueControls(controls);
      setAlerts(inbox);
    };
    void load();
    return () => {
      active = false;
    };
  }, [role]);

  useEffect(() => {
    if (!isAlertRole(role)) return undefined;
    function onInboxChanged(event: Event) {
      const latest = (event as CustomEvent<{ alerts?: ClinicalAlert[] }>).detail?.alerts;
      if (latest) setAlerts(latest);
    }
    window.addEventListener(ALERT_INBOX_CHANGED_EVENT, onInboxChanged);
    return () => window.removeEventListener(ALERT_INBOX_CHANGED_EVENT, onInboxChanged);
  }, [role]);

  return { patientTotal, overdueControls, alerts };
}

function buildQueue(alerts: ClinicalAlert[], overdueControls: ControlRow[]): QueueItem[] {
  const rows: QueueItem[] = [];
  for (const alert of alerts) {
    rows.push({
      key: `alert-${alert.id}`,
      name: alert.patientName ?? alert.encounterId,
      meta: alert.location ?? "Ubicación no registrada",
      tone: "danger",
      chip: alert.news2Total === null ? "Alerta abierta" : `NEWS2 ${alert.news2Total}`,
      action: { to: `/alertas/${alert.id}`, label: "Abrir alerta" },
      actionTone: "danger",
    });
  }
  for (const control of overdueControls) {
    if (rows.some((row) => row.name === control.patientName && row.action.to.includes("controles"))) continue;
    rows.push({
      key: `control-${control.encounterId}`,
      name: control.patientName,
      meta: control.location ?? "Ubicación no registrada",
      tone: "warning",
      chip: "Control vencido",
      action: { to: `/atencion/controles?ingreso=${encodeURIComponent(control.encounterId)}`, label: "Registrar constantes" },
      actionTone: "quiet",
    });
  }
  return rows;
}

function HomeActions({ tasks }: Readonly<{ tasks: HomeTask[] }>) {
  const primary = tasks[0] ?? null;
  const secondary = tasks.slice(1);
  return (
    <div className="home-actions">
      {primary ? <PrimaryAction task={primary} /> : null}
      {secondary.length > 0 ? (
        <div className="home-actions-links">
          {secondary.map((task, index) => (
            <span key={task.to}>
              {index > 0 ? <span className="home-actions-sep" aria-hidden> | </span> : null}
              <Link to={task.to}>{task.label}</Link>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function PrimaryAction({ task }: Readonly<{ task: HomeTask }>) {
  if (task.to === "/pacientes/nuevo") {
    return <Link className="button" to={task.to}>{task.label}</Link>;
  }
  return <ButtonLink to={task.to}>{task.label}</ButtonLink>;
}

function WorkQueue({ queue, hasTasks }: Readonly<{ queue: QueueItem[]; hasTasks: boolean }>) {
  return (
    <Panel
      title="Cola de trabajo"
      aside={queue.length > 0 ? `${queue.length} pendientes inmediatos` : undefined}
    >
      {queue.length > 0 ? (
        <ul className="queue-list">
          {queue.map((item) => (
            <QueueRow
              key={item.key}
              name={item.name}
              meta={item.meta}
              tone={item.tone}
              chip={item.chip}
              action={item.action}
              actionTone={item.actionTone}
            />
          ))}
        </ul>
      ) : (
        <div className="work-queue">
          <p className="hint">
            {hasTasks
              ? "No hay pendientes inmediatos de alertas o controles. Use los accesos del turno para continuar."
              : "Sin tareas pendientes para su perfil."}
          </p>
        </div>
      )}
    </Panel>
  );
}

export function HomePage() {
  const { user } = useAuth();
  const role = user?.role ?? "admision";
  const { kicker, title } = area(role);
  const tasks = homeTasks(role);
  const { patientTotal, overdueControls, alerts } = useHomeData(role);
  const showDashboard = isClinicalRole(role) || isAlertRole(role) || CONTROL_ROLES.has(role);
  const alertRole = isAlertRole(role);

  const emarOverdue = useMemo(
    () => alerts.filter((alert) => alert.source === "emar").length,
    [alerts],
  );
  const queue = useMemo(() => buildQueue(alerts, overdueControls), [alerts, overdueControls]);

  return (
    <section className="home">
      <header className="page-head">
        <div>
          <p className="kicker">{kicker}</p>
          <h2>{title}</h2>
        </div>
      </header>
      <p className="lead">{GUIDE[role]} Su perfil es {ROLE_LABEL[role]}.</p>

      {showDashboard ? (
        <div className="stat-grid" aria-label="Resumen del turno">
          <StatTile label="Pacientes en turno" value={patientTotal ?? "—"} hint="en censo" />
          <StatTile
            label="Controles vencidos"
            value={CONTROL_ROLES.has(role) ? overdueControls.length : "—"}
            hint="requieren registro"
            tone={overdueControls.length > 0 ? "warning" : "neutral"}
          />
          <StatTile
            label="Alertas abiertas"
            value={alertRole ? alerts.length : "—"}
            hint="activas"
            tone={alerts.length > 0 ? "danger" : "neutral"}
          />
          <StatTile
            label="Dosis e-MAR vencidas"
            value={alertRole ? emarOverdue : "—"}
            hint="tras gracia"
            tone={emarOverdue > 0 ? "warning" : "neutral"}
          />
        </div>
      ) : null}

      {tasks.length > 0 ? (
        <HomeActions tasks={tasks} />
      ) : (
        <p className="hint">Su espacio de trabajo estará disponible cuando se publique su módulo.</p>
      )}

      <WorkQueue queue={queue} hasTasks={tasks.length > 0} />

      {isClinicalRole(role) ? (
        <p className="hint">Primero abra un paciente hospitalizado; el menú lateral conservará ese ingreso al cambiar de pantalla.</p>
      ) : null}
    </section>
  );
}
