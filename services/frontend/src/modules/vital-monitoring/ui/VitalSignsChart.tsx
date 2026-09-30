import { useMemo } from "react";
import type { ChartPoint } from "./types";

type Props = {
  series: ChartPoint[];
};

/** Gráfica SVG de pulso y NEWS2 (RF-29). */
export function VitalSignsChart({ series }: Props) {
  const chart = useMemo(() => {
    if (series.length === 0) return null;
    const width = 960;
    const height = 340;
    const pad = 36;
    const pulses = series.map((p) => p.pulse ?? 0);
    const news = series.map((p) => p.news2 ?? 0);
    const minY = Math.min(...pulses, ...news, 0);
    const maxY = Math.max(...pulses, ...news, 1);
    const span = Math.max(maxY - minY, 1);

    const xAt = (index: number) =>
      series.length === 1
        ? width / 2
        : pad + (index / (series.length - 1)) * (width - pad * 2);
    const yAt = (value: number) =>
      height - pad - ((value - minY) / span) * (height - pad * 2);

    const pulsePath = series
      .map((point, index) => `${index === 0 ? "M" : "L"} ${xAt(index)} ${yAt(point.pulse ?? 0)}`)
      .join(" ");
    const newsPath = series
      .map((point, index) => `${index === 0 ? "M" : "L"} ${xAt(index)} ${yAt(point.news2 ?? 0)}`)
      .join(" ");

    return { width, height, pulsePath, newsPath, xAt, yAt };
  }, [series]);

  if (!chart) return null;

  return (
    <div className="vitals-chart-wrap">
      <svg
        className="vitals-chart"
        viewBox={`0 0 ${chart.width} ${chart.height}`}
        role="img"
        aria-label="Gráfica evolutiva de pulso y NEWS2"
      >
        <title>Gráfica evolutiva de signos vitales</title>
        <path d={chart.pulsePath} fill="none" stroke="currentColor" strokeWidth="3" className="vitals-chart-pulse" />
        <path d={chart.newsPath} fill="none" stroke="#c45c26" strokeWidth="2.5" strokeDasharray="6 4" className="vitals-chart-news2" />
        {series.map((point, index) => (
          <circle
            key={`p-${index}`}
            cx={chart.xAt(index)}
            cy={chart.yAt(point.pulse ?? 0)}
            r="4"
            fill="currentColor"
          />
        ))}
        <text x="16" y="24" className="vitals-chart-legend">Pulso</text>
        <text x="90" y="24" fill="#c45c26" className="vitals-chart-legend">NEWS2</text>
      </svg>
    </div>
  );
}
