import { useEffect, useState } from "react";
import { api } from "../../../app/api";
import { Feedback } from "../../../shared/ui/Sheet";
import { formatDateTime } from "../../../shared/datetime/format";
import { VitalSignsChart } from "./VitalSignsChart";
import type { ChartPoint } from "./types";

type Props = {
  encounterId: string;
  /** Si true, muestra también la tabla de historial. */
  showTable?: boolean;
};

/** Panel reutilizable de gráfica evolutiva (lectura) para enfermería y médicos. */
export function VitalSignsChartPanel({ encounterId, showTable = true }: Props) {
  const [series, setSeries] = useState<ChartPoint[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api<{ series: ChartPoint[] }>(
      `/api/v1/inpatient-care/encounters/${encodeURIComponent(encounterId)}/vital-signs/chart`,
    )
      .then((data) => {
        if (active) setSeries(data.series);
      })
      .catch(() => {
        if (active) setError("No se pudo cargar la gráfica de signos vitales.");
      });
    return () => {
      active = false;
    };
  }, [encounterId]);

  return (
    <section className="result-block" aria-label="Gráfica evolutiva">
      <h3>Gráfica evolutiva</h3>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {!error && series.length === 0 ? (
        <Feedback tone="info">Aún no hay lecturas para graficar.</Feedback>
      ) : null}
      {series.length > 0 ? (
        <>
          <VitalSignsChart series={series} />
          {showTable ? (
            <div className="table-wrap">
              <table>
                <caption>Historial reciente</caption>
                <thead>
                  <tr>
                    <th>Fecha y hora</th>
                    <th>Pulso</th>
                    <th>FR</th>
                    <th>SpO₂</th>
                    <th>NEWS2</th>
                  </tr>
                </thead>
                <tbody>
                  {series.map((point, index) => (
                    <tr key={index}>
                      <td>{formatDateTime(point.recordedAt)}</td>
                      <td>{point.pulse ?? "—"}</td>
                      <td>{point.respiratoryRate ?? "—"}</td>
                      <td>{point.oxygenSaturation ?? "—"}</td>
                      <td>{point.news2 ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
