import { type ReactNode } from "react";
import { type DateRangePreset, type DateRangeValue, resolveDateRange } from "../datetime/range";

const PRESETS: { id: DateRangePreset; label: string }[] = [
  { id: "hoy", label: "Hoy" },
  { id: "7d", label: "7 días" },
  { id: "30d", label: "30 días" },
  { id: "todo", label: "Todo" },
  { id: "custom", label: "Rango" },
];

type Props = {
  value: DateRangeValue;
  onChange: (next: DateRangeValue) => void;
  label?: string;
};

export function DateRangeFilter({ value, onChange, label = "Filtrar por fecha" }: Props) {
  return (
    <div className="date-range-filter" role="group" aria-label={label}>
      <div className="date-range-presets">
        {PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            className={value.preset === preset.id ? "chip is-active" : "chip"}
            aria-pressed={value.preset === preset.id}
            onClick={() => onChange(resolveDateRange(preset.id, value.from, value.to))}
          >
            {preset.label}
          </button>
        ))}
      </div>
      {value.preset === "custom" ? (
        <div className="date-range-inputs">
          <label>
            Desde
            <input
              type="date"
              value={value.from ?? ""}
              onChange={(e) => onChange({ preset: "custom", from: e.target.value || null, to: value.to })}
            />
          </label>
          <label>
            Hasta
            <input
              type="date"
              value={value.to ?? ""}
              onChange={(e) => onChange({ preset: "custom", from: value.from, to: e.target.value || null })}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}

type DaySectionProps = {
  label: string;
  count: number;
  defaultOpen?: boolean;
  children: ReactNode;
};

export function DaySection({ label, count, defaultOpen = false, children }: DaySectionProps) {
  return (
    <details className="day-section" open={defaultOpen}>
      <summary>
        <span>{label}</span>
        <span className="day-section-count">{count}</span>
      </summary>
      <div className="day-section-body">{children}</div>
    </details>
  );
}
