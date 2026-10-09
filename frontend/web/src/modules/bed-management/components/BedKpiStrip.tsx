import { StatTile } from "../../../shared/ui/clinical";
import { sharePct, type CensusTotals } from "../domain/census";

/** Capacidad y estado del hospital (RF-69), con porcentaje y barra como en el diseño. */
export function BedKpiStrip({ totals }: { totals: CensusTotals }) {
  const cells = [
    { label: "Capacidad total", value: totals.capacity, hint: "lechos", tone: "neutral" as const, pct: 100 },
    { label: "Disponibles", value: totals.available, hint: "libres", tone: "success" as const, pct: sharePct(totals.available, totals.capacity) },
    { label: "Ocupadas", value: totals.occupied, hint: "activas", tone: "neutral" as const, pct: sharePct(totals.occupied, totals.capacity) },
    { label: "Limpieza", value: totals.cleaning, hint: "en proceso", tone: "info" as const, pct: sharePct(totals.cleaning, totals.capacity) },
    { label: "Aislamiento", value: totals.isolation, hint: "lechos", tone: "warning" as const, pct: sharePct(totals.isolation, totals.capacity) },
  ];

  return (
    <div className="stat-grid" aria-label="Capacidad hospitalaria">
      {cells.map((cell) => (
        <div key={cell.label} className="stat-cell">
          <StatTile label={cell.label} value={cell.value} hint={cell.hint} tone={cell.tone} />
          <div className="stat-share" aria-hidden><span style={{ width: `${cell.pct}%` }} /></div>
        </div>
      ))}
    </div>
  );
}
