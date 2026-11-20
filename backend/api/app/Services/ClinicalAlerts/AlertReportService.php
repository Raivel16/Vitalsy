<?php

namespace App\Services\ClinicalAlerts;

use App\Models\AdmissionEncounter;
use App\Models\AlertAcknowledgement;
use App\Models\AlertEscalation;
use App\Models\ClinicalAlert;
use Carbon\CarbonImmutable;
use Carbon\CarbonPeriod;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * RF-114: indicadores de monitoreo y respuesta a alertas calculados a partir de
 * los registros de `clinical_alerts`, `alert_acknowledgements` y `alert_escalations`.
 */
class AlertReportService
{
    public const SEVERITIES = ['alta', 'media', 'baja'];

    public const SOURCES = ['news2', 'observacion', 'control', 'emar'];

    public const DEFAULT_DAYS = 7;

    public const MAX_DAYS = 90;

    private const NURSING_ROLES = ['enfermera_piso', 'enfermera_supervisora', 'auxiliar_enfermeria'];

    private const MEDICAL_ROLES = ['medico_residente', 'medico_tratante'];

    private const SUPERVISOR_ROLE = 'enfermera_supervisora';

    private const RAPID_RESPONSE_ROLE = 'equipo_respuesta_rapida';

    private const NEWS2_BANDS = ['0' => [0, 0], '1-4' => [1, 4], '5-6' => [5, 6], '7+' => [7, PHP_INT_MAX]];

    /**
     * @param  array{from?: ?string, to?: ?string, severity?: ?string, source?: ?string, service?: ?string}  $filters
     * @return array<string, mixed>
     */
    public function build(array $filters): array
    {
        [$from, $to] = $this->period($filters['from'] ?? null, $filters['to'] ?? null);
        $alerts = $this->alerts($from, $to, $filters);

        return [
            'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'filters' => [
                'severity' => $filters['severity'] ?? null,
                'source' => $filters['source'] ?? null,
                'service' => $filters['service'] ?? null,
            ],
            'options' => ['services' => $this->services()],
            'summary' => $this->summary($alerts),
            'nurseAcknowledgement' => $this->nurseAcknowledgement($alerts),
            'escalation' => $this->escalation($alerts),
            'medicalResponse' => $this->medicalResponse($alerts),
            'bySeverity' => $this->countBy($alerts, 'severity', self::SEVERITIES),
            'bySource' => $this->countBy($alerts, 'source', self::SOURCES),
            'byStatus' => $this->countBy($alerts, 'status', $alerts->pluck('status')->unique()->sort()->values()->all()),
            'news2Distribution' => $this->news2Distribution($alerts),
            'daily' => $this->daily($alerts, $from, $to),
        ];
    }

    /** @return array{0: CarbonImmutable, 1: CarbonImmutable} */
    public function period(?string $from, ?string $to): array
    {
        $end = $to !== null ? CarbonImmutable::parse($to) : CarbonImmutable::now();
        $start = $from !== null ? CarbonImmutable::parse($from) : $end->subDays(self::DEFAULT_DAYS - 1);

        return [$start->startOfDay(), $end->endOfDay()];
    }

    /**
     * @param  array<string, ?string>  $filters
     * @return Collection<int, ClinicalAlert>
     */
    private function alerts(CarbonImmutable $from, CarbonImmutable $to, array $filters): Collection
    {
        $query = ClinicalAlert::query()
            ->with(['acknowledgements', 'escalations'])
            ->whereBetween('generated_at', [$from, $to]);

        foreach (['severity', 'source'] as $column) {
            if (! empty($filters[$column])) {
                $query->where($column, $filters[$column]);
            }
        }

        if (! empty($filters['service'])) {
            $query->whereIn(
                'encounter_id',
                AdmissionEncounter::query()->where('service', $filters['service'])->select('encounter_id'),
            );
        }

        return $query->get();
    }

    /** @return list<string> */
    private function services(): array
    {
        return AdmissionEncounter::query()
            ->whereIn('encounter_id', ClinicalAlert::query()->select('encounter_id'))
            ->whereNotNull('service')
            ->distinct()
            ->orderBy('service')
            ->pluck('service')
            ->all();
    }

    /**
     * @param  Collection<int, ClinicalAlert>  $alerts
     * @return array<string, int>
     */
    private function summary(Collection $alerts): array
    {
        $closed = $alerts->filter(fn (ClinicalAlert $alert) => $alert->isClosed())->count();

        return [
            'totalAlerts' => $alerts->count(),
            'closedAlerts' => $closed,
            'activeAlerts' => $alerts->count() - $closed,
            'icuTransfers' => $alerts->whereNotNull('icu_transferred_at')->count(),
        ];
    }

    /**
     * RF-44/45: minutos entre la generación y el primer acuse de enfermería.
     *
     * @param  Collection<int, ClinicalAlert>  $alerts
     * @return array<string, mixed>
     */
    private function nurseAcknowledgement(Collection $alerts): array
    {
        $minutes = $alerts
            ->map(fn (ClinicalAlert $alert) => $this->firstAckMinutes($alert, self::NURSING_ROLES, $alert->generated_at))
            ->filter(fn (?float $value) => $value !== null);

        return $this->responseTimes($minutes, $this->minutes('nurse_ack_minutes')) + [
            'pending' => $alerts->count() - $minutes->count(),
        ];
    }

    /**
     * RF-47/48: minutos entre la notificación al médico y su acuse.
     *
     * @param  Collection<int, ClinicalAlert>  $alerts
     * @return array<string, mixed>
     */
    private function medicalResponse(Collection $alerts): array
    {
        $notified = $alerts->whereNotNull('medical_notified_at');
        $minutes = $notified
            ->map(fn (ClinicalAlert $alert) => $this->firstAckMinutes($alert, self::MEDICAL_ROLES, $alert->medical_notified_at))
            ->filter(fn (?float $value) => $value !== null);

        return $this->responseTimes($minutes, $this->minutes('medical_response_minutes')) + [
            'notified' => $notified->count(),
        ];
    }

    /**
     * @param  Collection<int, ClinicalAlert>  $alerts
     * @return array<string, mixed>
     */
    private function escalation(Collection $alerts): array
    {
        $escalations = $alerts->flatMap(fn (ClinicalAlert $alert) => $alert->escalations);
        $escalated = $alerts->filter(fn (ClinicalAlert $alert) => $alert->escalations->isNotEmpty())->count();

        return [
            'escalatedAlerts' => $escalated,
            'ratePercent' => $this->percent($escalated, $alerts->count()),
            'toSupervisor' => $this->escalationsTo($escalations, self::SUPERVISOR_ROLE),
            'toRapidResponse' => $this->escalationsTo($escalations, self::RAPID_RESPONSE_ROLE),
        ];
    }

    /** @param Collection<int, AlertEscalation> $escalations */
    private function escalationsTo(Collection $escalations, string $role): int
    {
        return $escalations->where('to_role', $role)->pluck('alert_id')->unique()->count();
    }

    /** @param list<string> $roles */
    private function firstAckMinutes(ClinicalAlert $alert, array $roles, ?Carbon $since): ?float
    {
        if ($since === null) {
            return null;
        }

        $first = $alert->acknowledgements
            ->filter(fn (AlertAcknowledgement $ack) => in_array($ack->role, $roles, true) && $ack->acknowledged_at->gte($since))
            ->sortBy('acknowledged_at')
            ->first();

        return $first === null ? null : $since->diffInSeconds($first->acknowledged_at) / 60;
    }

    /**
     * @param  Collection<int, float>  $minutes
     * @return array<string, mixed>
     */
    private function responseTimes(Collection $minutes, int $target): array
    {
        $measured = $minutes->count();

        return [
            'targetMinutes' => $target,
            'measured' => $measured,
            'averageMinutes' => $measured === 0 ? null : round($minutes->avg(), 1),
            'withinTargetPercent' => $this->percent($minutes->filter(fn (float $value) => $value <= $target)->count(), $measured),
        ];
    }

    /**
     * @param  Collection<int, ClinicalAlert>  $alerts
     * @param  list<string>  $keys
     * @return list<array{key: string, count: int}>
     */
    private function countBy(Collection $alerts, string $attribute, array $keys): array
    {
        $counts = $alerts->countBy($attribute);

        return array_map(fn (string $key) => ['key' => $key, 'count' => (int) ($counts[$key] ?? 0)], $keys);
    }

    /**
     * @param  Collection<int, ClinicalAlert>  $alerts
     * @return list<array{band: string, count: int}>
     */
    private function news2Distribution(Collection $alerts): array
    {
        $scores = $alerts->pluck('news2_total')->filter(fn ($score) => $score !== null);
        $bands = [];
        foreach (self::NEWS2_BANDS as $band => [$min, $max]) {
            $bands[] = [
                'band' => (string) $band,
                'count' => $scores->filter(fn (int $score) => $score >= $min && $score <= $max)->count(),
            ];
        }

        return $bands;
    }

    /**
     * @param  Collection<int, ClinicalAlert>  $alerts
     * @return list<array<string, int|string>>
     */
    private function daily(Collection $alerts, CarbonImmutable $from, CarbonImmutable $to): array
    {
        $byDay = $alerts->groupBy(fn (ClinicalAlert $alert) => $alert->generated_at->toDateString());
        $days = [];
        foreach (CarbonPeriod::create($from->startOfDay(), $to->startOfDay()) as $day) {
            $date = $day->toDateString();
            $ofDay = $byDay->get($date, collect());
            $row = ['date' => $date, 'total' => $ofDay->count()];
            foreach (self::SEVERITIES as $severity) {
                $row[$severity] = $ofDay->where('severity', $severity)->count();
            }
            $days[] = $row;
        }

        return $days;
    }

    private function percent(int $part, int $total): ?float
    {
        return $total === 0 ? null : round($part * 100 / $total, 1);
    }

    private function minutes(string $key): int
    {
        return (int) config("vitalsy.alerts.{$key}");
    }
}
