<?php

namespace App\Services\Life;

use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * Línea de base personal de Vitalsy Life en servidor. Replica `baselineForKind` de la app móvil
 * (movil/src/modules/health-sync/domain/baseline.ts): ventana de 14 días, percentil 10-90 del
 * historial sin las 3 lecturas más recientes y al menos 7 días de historia útil.
 */
class BaselineCalculator
{
    /** Mismos identificadores que DEVIATION_KINDS (movil/src/modules/health-sync/domain/types.ts:26). */
    public const KINDS = ['heart_rate', 'resting_heart_rate', 'spo2', 'hrv', 'skin_temperature', 'body_temperature'];

    private const WINDOW_DAYS = 14;

    private const MIN_DAYS = 7;

    private const TAIL = 3;

    /**
     * @param  Collection<int, object>  $samples  objetos con kind, value y started_at
     * @return array<int, array{kind:string,low:float,high:float,days:int}>
     */
    public function summarize(Collection $samples, ?CarbonInterface $now = null): array
    {
        $now = $now ? Carbon::instance($now) : Carbon::now();
        $from = $now->copy()->subDays(self::WINDOW_DAYS);

        $metrics = [];
        foreach (self::KINDS as $kind) {
            $series = $samples
                ->filter(fn ($s) => $s->kind === $kind)
                ->map(fn ($s) => ['at' => Carbon::parse($s->started_at), 'value' => (float) $s->value])
                ->filter(fn ($s) => $s['at']->greaterThanOrEqualTo($from) && $s['at']->lessThanOrEqualTo($now))
                ->sortBy(fn ($s) => $s['at']->getTimestamp())
                ->values();

            if ($series->count() <= self::TAIL) {
                continue;
            }

            $fitting = $series->slice(0, $series->count() - self::TAIL);
            $days = $fitting->map(fn ($s) => $s['at']->copy()->utc()->format('Y-m-d'))->unique()->count();
            if ($days < self::MIN_DAYS) {
                continue;
            }

            $values = $fitting->pluck('value')->sort()->values()->all();
            $metrics[] = [
                'kind' => $kind,
                'low' => $this->percentile($values, 10),
                'high' => $this->percentile($values, 90),
                'days' => $days,
            ];
        }

        return $metrics;
    }

    /** Interpolación lineal idéntica a `percentile` en movil/src/modules/health-sync/domain/baseline.ts:20. */
    private function percentile(array $sorted, int $p): float
    {
        if (count($sorted) === 1) {
            return (float) $sorted[0];
        }
        $rank = ($p / 100) * (count($sorted) - 1);
        $low = (int) floor($rank);
        $high = (int) ceil($rank);
        if ($low === $high) {
            return (float) $sorted[$low];
        }
        $weight = $rank - $low;

        return $sorted[$low] * (1 - $weight) + $sorted[$high] * $weight;
    }
}
