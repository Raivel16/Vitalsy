import { MetricRow } from "../../../shared/ui/clinical";
import { lifeKindLabel, lifeMetricRange, type LifeMetric } from "../domain/lifeBaseline";

/** Una fila por métrica de la línea de base domiciliaria con su rango personal. */
export function LifeBaselineMetrics({ metrics }: { metrics: LifeMetric[] }) {
  return (
    <MetricRow
      items={metrics.map((metric) => ({
        label: lifeKindLabel(metric.kind),
        value: lifeMetricRange(metric),
      }))}
    />
  );
}
