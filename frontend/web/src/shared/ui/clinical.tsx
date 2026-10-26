import type { ReactNode } from "react";
import { ButtonLink } from "./Button";

export type BedVisual = "available" | "occupied" | "cleaning" | "isolation" | "neutral";
export type ClinicalTone = "neutral" | "success" | "warning" | "danger" | "info";

const BED_LABEL: Record<BedVisual, string> = {
  available: "Disponible",
  occupied: "Ocupada",
  cleaning: "Limpieza",
  isolation: "Aislamiento",
  neutral: "Sin estado",
};

/** Mapea el estado persistido del censo a la ficha visual. El aislamiento pisa al resto. */
// eslint-disable-next-line react-refresh/only-export-components
export function bedTone(status: string, isolation = false): BedVisual {
  if (isolation) return "isolation";
  if (status === "available" || status === "disponible") return "available";
  if (status === "occupied" || status === "ocupada") return "occupied";
  if (status === "cleaning" || status === "limpieza" || status === "desinfeccion") return "cleaning";
  return "neutral";
}

export function StatusMark({ tone, children }: Readonly<{ tone: BedVisual; children?: ReactNode }>) {
  return <span className={`status-mark status-${tone}`}>{children ?? BED_LABEL[tone]}</span>;
}

export function MetricRow({ items }: Readonly<{ items: Array<{ label: string; value: number | string }> }>) {
  return (
    <ul className="metric-row">
      {items.map((item) => (
        <li key={item.label}>
          <strong>{item.value}</strong>
          <span>{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

/** Tile compacto de métrica del dashboard (Inicio, Camas, Alertas). */
export function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
}: Readonly<{
  label: string;
  value: number | string;
  hint?: string;
  tone?: ClinicalTone;
}>) {
  return (
    <article className={`stat-tile tone-${tone}`}>
      <span className="stat-tile-label">{label}</span>
      <p className="stat-tile-value">
        <strong>{value}</strong>
        {hint ? <span>{hint}</span> : null}
      </p>
    </article>
  );
}

export function StatusPill({ tone = "neutral", children }: Readonly<{ tone?: ClinicalTone; children: ReactNode }>) {
  return <span className={`status-pill pill-${tone}`}>{children}</span>;
}

export function ProgressTrack({ done, total }: Readonly<{ done: number; total: number }>) {
  const safeTotal = Math.max(total, 0);
  const safeDone = Math.min(Math.max(done, 0), safeTotal || done);
  const pct = safeTotal === 0 ? 0 : Math.round((safeDone / safeTotal) * 100);
  return (
    <div className="progress-track" aria-label={`${safeDone} de ${safeTotal} completados`}>
      <div className="progress-track-meta">
        <span>{safeDone} de {safeTotal}</span>
        <span>{pct}%</span>
      </div>
      <div className="progress-track-bar" aria-hidden>
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Fila de cola de trabajo: paciente, meta, chip y CTA. */
export function QueueRow({
  name,
  meta,
  tone = "neutral",
  chip,
  action,
  actionTone = "primary",
}: Readonly<{
  name: string;
  meta?: string;
  tone?: ClinicalTone;
  chip?: ReactNode;
  action?: { to: string; label: string };
  actionTone?: "primary" | "quiet" | "danger";
}>) {
  return (
    <li className={`queue-row tone-${tone}`}>
      <div className="queue-row-main">
        <span className="queue-dot" aria-hidden />
        <div>
          <p className="queue-row-name">{name}</p>
          {meta ? <p className="queue-row-meta">{meta}</p> : null}
        </div>
      </div>
      <div className="queue-row-actions">
        {chip ? <StatusPill tone={tone}>{chip}</StatusPill> : null}
        {action ? (
          <ButtonLink
            to={action.to}
            variant={actionTone === "quiet" ? "quiet" : "primary"}
            className={actionTone === "danger" ? "button-danger" : undefined}
          >
            {action.label}
          </ButtonLink>
        ) : null}
      </div>
    </li>
  );
}

export function BedTile({
  room,
  code,
  status,
  isolation = false,
}: Readonly<{
  room: string;
  code: string;
  status: string;
  isolation?: boolean;
}>) {
  const tone = bedTone(status, isolation);
  return (
    <article className={`bed-tile bed-${tone}`}>
      <p className="bed-tile-code">{room}-{code}</p>
      <StatusMark tone={tone} />
    </article>
  );
}

/** Contenedor de una sola responsabilidad para bloques de una pantalla clínica. */
export function Panel({
  title,
  aside,
  children,
}: Readonly<{
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}>) {
  return (
    <section className="panel" aria-label={title}>
      <header className="panel-head">
        <h3>{title}</h3>
        {aside ? <div className="panel-aside">{aside}</div> : null}
      </header>
      {children}
    </section>
  );
}
