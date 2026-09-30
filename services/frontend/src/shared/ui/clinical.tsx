import type { ReactNode } from "react";

export type BedVisual = "available" | "occupied" | "cleaning" | "isolation" | "neutral";

const BED_LABEL: Record<BedVisual, string> = {
  available: "Disponible",
  occupied: "Ocupada",
  cleaning: "Limpieza",
  isolation: "Aislamiento",
  neutral: "Sin estado",
};

/** Mapea el estado persistido del censo a la ficha visual. El aislamiento pisa al resto. */
export function bedTone(status: string, isolation = false): BedVisual {
  if (isolation) return "isolation";
  if (status === "available" || status === "disponible") return "available";
  if (status === "occupied" || status === "ocupada") return "occupied";
  if (status === "cleaning" || status === "limpieza" || status === "desinfeccion") return "cleaning";
  return "neutral";
}

export function StatusMark({ tone, children }: { tone: BedVisual; children?: ReactNode }) {
  return <span className={`status-mark status-${tone}`}>{children ?? BED_LABEL[tone]}</span>;
}

export function MetricRow({ items }: { items: Array<{ label: string; value: number | string }> }) {
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

export function BedTile({
  room,
  code,
  status,
  isolation = false,
}: {
  room: string;
  code: string;
  status: string;
  isolation?: boolean;
}) {
  const tone = bedTone(status, isolation);
  return (
    <article className={`bed-tile bed-${tone}`}>
      <p className="bed-tile-code">{room}-{code}</p>
      <StatusMark tone={tone} />
    </article>
  );
}
