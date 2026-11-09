import type { DailyRow } from "../domain/report";

export type BarDatum = { label: string; value: number; tone?: "danger" | "warning" | "info" | "neutral" };

const ROW_HEIGHT = 30;
const LABEL_WIDTH = 170;
const BAR_WIDTH = 260;

/** Barras horizontales en SVG para conteos por categoría (RF-114). */
export function HorizontalBarChart({ title, data }: Readonly<{ title: string; data: BarDatum[] }>) {
  const max = Math.max(1, ...data.map((item) => item.value));
  const height = data.length * ROW_HEIGHT;
  const summary = data.map((item) => `${item.label}: ${item.value}`).join(", ");

  return (
    <figure className="report-chart">
      <figcaption>{title}</figcaption>
      <svg
        role="img"
        aria-label={`${title}. ${summary}`}
        viewBox={`0 0 ${LABEL_WIDTH + BAR_WIDTH + 40} ${height}`}
        preserveAspectRatio="xMinYMin meet"
      >
        {data.map((item, index) => {
          const y = index * ROW_HEIGHT;
          const width = (item.value / max) * BAR_WIDTH;
          return (
            <g key={item.label}>
              <text className="report-chart-label" x={0} y={y + 19}>{item.label}</text>
              <rect className={`report-bar tone-${item.tone ?? "info"}`} x={LABEL_WIDTH} y={y + 6} width={width} height={18} rx={3} />
              <text className="report-chart-value" x={LABEL_WIDTH + width + 6} y={y + 19}>{item.value}</text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

const DAY_WIDTH = 34;
const PLOT_HEIGHT = 140;
const SEVERITY_STACK = [
  { key: "alta", tone: "danger" },
  { key: "media", tone: "warning" },
  { key: "baja", tone: "info" },
] as const;

/** Columnas apiladas por severidad para la tendencia diaria de alertas. */
export function DailyAlertsChart({ rows }: Readonly<{ rows: DailyRow[] }>) {
  const max = Math.max(1, ...rows.map((row) => row.total));
  const width = Math.max(rows.length * DAY_WIDTH, DAY_WIDTH);
  const total = rows.reduce((sum, row) => sum + row.total, 0);

  return (
    <figure className="report-chart">
      <figcaption>Alertas por día y severidad</figcaption>
      <svg
        role="img"
        aria-label={`Alertas por día: ${total} en ${rows.length} días`}
        viewBox={`0 0 ${width} ${PLOT_HEIGHT + 22}`}
        preserveAspectRatio="xMinYMin meet"
      >
        {rows.map((row, index) => {
          const x = index * DAY_WIDTH + 6;
          let top = PLOT_HEIGHT;
          return (
            <g key={row.date}>
              <title>{`${row.date}: ${row.total} alertas`}</title>
              {SEVERITY_STACK.map(({ key, tone }) => {
                const h = (row[key] / max) * PLOT_HEIGHT;
                top -= h;
                return h > 0 ? <rect key={key} className={`report-bar tone-${tone}`} x={x} y={top} width={DAY_WIDTH - 12} height={h} /> : null;
              })}
              <text className="report-chart-axis" x={x + (DAY_WIDTH - 12) / 2} y={PLOT_HEIGHT + 16} textAnchor="middle">
                {row.date.slice(8)}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="report-legend">
        {SEVERITY_STACK.map(({ key, tone }) => (
          <span key={key}><i className={`report-swatch tone-${tone}`} aria-hidden /> {key}</span>
        ))}
      </p>
    </figure>
  );
}
