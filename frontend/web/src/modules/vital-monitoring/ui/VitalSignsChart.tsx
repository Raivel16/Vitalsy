import { useMemo } from "react";
import { formatTime } from "../../../shared/datetime/format";
import type { ChartPoint } from "./types";

type Props = {
  series: ChartPoint[];
};

type Lane = {
  label: string;
  unit: string;
  color: string;
  values: Array<number | null>;
};

/** Dos escalas separadas: el pulso (lpm) no aplasta el NEWS2. */
export function VitalSignsChart({ series }: Readonly<Props>) {
  const lanes = useMemo<Lane[]>(() => [
    {
      label: "Pulso",
      unit: "lpm",
      color: "#1e6b7b",
      values: series.map((point) => point.pulse),
    },
    {
      label: "NEWS2",
      unit: "puntos",
      color: "#8c6008",
      values: series.map((point) => point.news2),
    },
  ], [series]);

  if (series.length === 0) return null;

  return (
    <div className="vitals-lanes" role="img" aria-label="Gráfica evolutiva de pulso y NEWS2">
      {lanes.map((lane) => (
        <VitalLane key={lane.label} lane={lane} series={series} />
      ))}
    </div>
  );
}

function VitalLane({ lane, series }: Readonly<{ lane: Lane; series: ChartPoint[] }>) {
  const width = 960;
  const height = 168;
  const padX = 36;
  const padY = 28;
  const numbers = lane.values.filter((value): value is number => value !== null);
  const min = numbers.length ? Math.min(...numbers) : 0;
  const max = numbers.length ? Math.max(...numbers) : 1;
  const span = Math.max(max - min, lane.label === "NEWS2" ? 1 : 4);

  const xAt = (index: number) =>
    series.length === 1 ? width / 2 : padX + (index / (series.length - 1)) * (width - padX * 2);
  const yAt = (value: number) =>
    height - padY - ((value - min) / span) * (height - padY * 2);

  const path = series
    .map((_point, index) => {
      const value = lane.values[index];
      if (value === null) return null;
      return `${index === 0 || lane.values[index - 1] === null ? "M" : "L"} ${xAt(index)} ${yAt(value)}`;
    })
    .filter(Boolean)
    .join(" ");

  const ticks = series.length <= 6
    ? series.map((_, index) => index)
    : [0, Math.floor((series.length - 1) / 2), series.length - 1];

  return (
    <figure className="vitals-lane">
      <figcaption>
        <span>{lane.label}</span>
        <span>{lane.unit}</span>
      </figcaption>
      <svg className="vitals-chart" viewBox={`0 0 ${width} ${height}`}>
        <line x1={padX} y1={padY} x2={padX} y2={height - padY} stroke="#d1d6dc" />
        <line x1={padX} y1={height - padY} x2={width - padX} y2={height - padY} stroke="#d1d6dc" />
        <text x={8} y={padY + 4} className="vitals-chart-axis">{max}</text>
        <text x={8} y={height - padY} className="vitals-chart-axis">{min}</text>
        {path ? (
          <path d={path} fill="none" stroke={lane.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        ) : null}
        {series.map((_point, index) => {
          const value = lane.values[index];
          if (value === null) return null;
          const x = xAt(index);
          const y = yAt(value);
          return (
            <g key={`${lane.label}-${index}`}>
              <circle cx={x} cy={y} r="4" fill={lane.color} />
              <text x={x} y={y - 10} textAnchor="middle" className="vitals-chart-value" fill={lane.color}>
                {value}
              </text>
            </g>
          );
        })}
        {ticks.map((index) => (
          <text key={`t-${index}`} x={xAt(index)} y={height - 8} textAnchor="middle" className="vitals-chart-axis">
            {formatTime(series[index]?.recordedAt)}
          </text>
        ))}
      </svg>
    </figure>
  );
}
