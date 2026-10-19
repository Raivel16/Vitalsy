import { useEffect, useState } from "react";
import { api } from "../../../app/api";
import { Feedback } from "../../../shared/ui/Sheet";
import { LoadingState } from "../../../shared/ui/LoadingState";
import { formatDateTime } from "../../../shared/datetime/format";
import { type DateRangeValue } from "../../../shared/datetime/range";
import { filterByRange } from "../../../shared/navigation/returnTo";
import { VitalSignsChart } from "./VitalSignsChart";
import type { ChartPoint } from "./types";
import { keyByContent } from "../../../shared/list/rowKeys";

type Props = {
  encounterId: string;
  /** Si true, muestra también la tabla de historial. */
  showTable?: boolean;
  /** Filtro temporal aplicado a la gráfica y al historial del panel. */
  range?: DateRangeValue;
};

/** Panel reutilizable de gráfica evolutiva (lectura) para enfermería y médicos. */
export function VitalSignsChartPanel({ encounterId, showTable = true, range }: Readonly<Props>) {
  const [series, setSeries] = useState<ChartPoint[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setSeries(null);
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

  const filtered = filterByRange(series ?? [], (point) => point.recordedAt, range);

  return (
    <section className="result-block" aria-label="Gráfica evolutiva">
      <h3>Gráfica evolutiva</h3>
      {error ? <Feedback tone="error">{error}</Feedback> : null}
      {!error && series === null ? <LoadingState label="Cargando gráfica evolutiva…" /> : null}
      {!error && series && filtered.length === 0 ? (
        <Feedback tone="info">No hay lecturas para graficar en el rango seleccionado.</Feedback>
      ) : null}
      {filtered.length > 0 ? (
        <>
          <VitalSignsChart series={filtered} />
          {showTable ? (
            <div className="table-wrap">
              <table>
                <caption>Historial del rango</caption>
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
                  {keyByContent(filtered, (point) => `${point.recordedAt}|${point.pulse}|${point.respiratoryRate}|${point.oxygenSaturation}|${point.news2}`).map(({ key, item: point }) => (
                    <tr key={key}>
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
