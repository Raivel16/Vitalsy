import type { FlowRow } from "../domain/indicators";

const DAY_WIDTH = 40;
const PLOT_HEIGHT = 140;
const BAR_WIDTH = 12;

/** Columnas de ingresos y altas por día (RF-115). */
export function FlowChart({ rows }: Readonly<{ rows: FlowRow[] }>) {
  const max = Math.max(1, ...rows.flatMap((row) => [row.admissions, row.discharges]));
  const width = Math.max(rows.length * DAY_WIDTH, DAY_WIDTH);
  const admissions = rows.reduce((sum, row) => sum + row.admissions, 0);
  const discharges = rows.reduce((sum, row) => sum + row.discharges, 0);

  return (
    <figure className="report-chart">
      <figcaption>Ingresos y altas por día</figcaption>
      <svg
        role="img"
        aria-label={`Ingresos y altas por día: ${admissions} ingresos y ${discharges} altas en ${rows.length} días`}
        viewBox={`0 0 ${width} ${PLOT_HEIGHT + 22}`}
        preserveAspectRatio="xMinYMin meet"
      >
        {rows.map((row, index) => {
          const x = index * DAY_WIDTH + 6;
          const admissionsHeight = (row.admissions / max) * PLOT_HEIGHT;
          const dischargesHeight = (row.discharges / max) * PLOT_HEIGHT;
          return (
            <g key={row.date}>
              <title>{`${row.date}: ${row.admissions} ingresos, ${row.discharges} altas`}</title>
              <rect className="report-bar tone-info" x={x} y={PLOT_HEIGHT - admissionsHeight} width={BAR_WIDTH} height={admissionsHeight} />
              <rect className="report-bar tone-neutral" x={x + BAR_WIDTH + 2} y={PLOT_HEIGHT - dischargesHeight} width={BAR_WIDTH} height={dischargesHeight} />
              <text className="report-chart-axis" x={x + BAR_WIDTH} y={PLOT_HEIGHT + 16} textAnchor="middle">
                {row.date.slice(8)}
              </text>
            </g>
          );
        })}
      </svg>
      <p className="report-legend">
        <span><i className="report-swatch tone-info" aria-hidden /> ingresos</span>
        <span><i className="report-swatch tone-neutral" aria-hidden /> altas</span>
      </p>
    </figure>
  );
}
