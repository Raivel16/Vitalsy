<?php

namespace App\Services\Life;

use App\Models\LifeAccount;
use App\Models\LifeBiometricSample;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;

/**
 * Avisos preventivos y de hábito de Vitalsy Life calculados en servidor. Replica `draftNudge`
 * (movil/src/modules/notices/domain/nudges.ts). Life es bienestar: nunca emite diagnósticos ni
 * usa lenguaje clínico (kit de marca), por eso los textos evitan «diagnóstico».
 */
class NudgeEngine
{
    private const WINDOW_DAYS = 14;

    private const TAIL = 3;

    public function __construct(private readonly BaselineCalculator $baselines) {}

    /**
     * @return array<int, array{id:string,kind:string,title:string,body:string,metric:string,createdAt:string}>
     */
    public function notices(LifeAccount $account, ?CarbonInterface $now = null): array
    {
        $now = $now ? Carbon::instance($now) : Carbon::now();
        $day = $now->copy()->utc()->format('Y-m-d');
        $createdAt = $now->copy()->utc()->toIso8601String();

        $samples = LifeBiometricSample::query()
            ->where('life_account_id', $account->id)
            ->where('started_at', '>=', $now->copy()->subDays(self::WINDOW_DAYS))
            ->where('started_at', '<=', $now)
            ->get(['kind', 'value', 'started_at']);

        $kinds = [...BaselineCalculator::KINDS, 'steps', 'sleep'];
        $ranges = collect($this->baselines->summarize($samples, $now, $kinds))->keyBy('kind');

        $notices = [];

        foreach (BaselineCalculator::KINDS as $kind) {
            $range = $ranges->get($kind);
            if (! $range) {
                continue;
            }
            $tail = $this->series($samples, $kind)->slice(-self::TAIL)->values();
            if ($tail->count() < self::TAIL) {
                continue;
            }
            if (! $tail->every(fn ($v) => $v < $range['low'] || $v > $range['high'])) {
                continue;
            }
            $lower = $tail->last() < $range['low'];
            $notices[] = [
                'id' => "deviation-{$kind}-{$day}",
                'kind' => 'preventivo',
                'title' => $lower ? 'Un ritmo un poco más bajo de lo usual' : 'Un ritmo un poco más alto de lo usual',
                'body' => 'Llevas varias lecturas fuera de tu línea de base personal. Es una señal preventiva, no una indicación médica. Si te sientes mal, contacta a tu servicio de salud.',
                'metric' => $kind,
                'createdAt' => $createdAt,
            ];
        }

        $habits = [
            'steps' => ['Un paseo corto, a tu ritmo', 'Hoy vas por debajo de tu actividad habitual. Unos minutos de caminata suave pueden acercarte a tu ritmo de los últimos días.'],
            'sleep' => ['Descanso más breve que tu usual', 'Dormiste menos que tu línea de base. Una pausa sin pantallas esta noche puede ayudarte a recuperar tu ritmo.'],
        ];
        foreach ($habits as $kind => [$title, $body]) {
            $range = $ranges->get($kind);
            $latest = $this->series($samples, $kind)->last();
            if ($range && $latest !== null && $latest < $range['low']) {
                $notices[] = [
                    'id' => "habit-{$kind}-{$day}",
                    'kind' => 'habito',
                    'title' => $title,
                    'body' => $body,
                    'metric' => $kind,
                    'createdAt' => $createdAt,
                ];
            }
        }

        return $notices;
    }

    /** Valores del tipo ordenados por fecha ascendente. */
    private function series($samples, string $kind)
    {
        return $samples->where('kind', $kind)
            ->sortBy(fn ($s) => $s->started_at->getTimestamp())
            ->map(fn ($s) => (float) $s->value)
            ->values();
    }
}
