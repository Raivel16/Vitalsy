<?php

namespace App\Services\InpatientCare;

use App\Models\AdmissionEncounter;
use App\Models\MonitoringSchedule;
use App\Models\User;
use App\Models\VitalSignReading;
use App\Services\Clinical\ButterworthFilter;
use App\Services\Clinical\News2Calculator;
use App\Services\ClinicalAlerts\AlertRecorder;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class VitalSignsMonitoring
{
    public function __construct(
        private readonly News2Calculator $news2,
        private readonly ButterworthFilter $filter,
        private readonly AlertRecorder $alerts,
    ) {}

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function storeManual(string $encounterId, array $input, ?User $user = null, bool $activateAlerts = true): array
    {
        $this->requireEncounter($encounterId);

        return $this->persistReading($encounterId, [
            'rr' => (int) round((float) $input['respiratoryRate']),
            'spo2' => (int) round((float) $input['oxygenSaturation']),
            'sbp' => (int) round((float) $input['systolicBloodPressure']),
            'dbp' => isset($input['diastolicBloodPressure']) ? (int) round((float) $input['diastolicBloodPressure']) : null,
            'pulse' => (int) round((float) $input['pulse']),
            'temperature' => round((float) $input['temperature'], 1),
            'spo2_scale' => $input['spo2Scale'] ?? 'scale1',
            'supplemental_oxygen' => (bool) ($input['supplementalOxygen'] ?? false),
            'consciousness' => $input['consciousness'] ?? 'alert',
            'confusion_onset' => $input['confusionOnset'] ?? null,
        ], $user, filtered: false, activateAlerts: $activateAlerts);
    }

    /**
     * @param  array{samples: list<array<string, mixed>>, consciousness?: string, supplementalOxygen?: bool, spo2Scale?: string}  $payload
     * @return array<string, mixed>
     */
    public function storeTelemetry(string $encounterId, array $payload, ?User $user = null): array
    {
        $this->requireEncounter($encounterId);
        $samples = $payload['samples'] ?? [];
        if (count($samples) < 4) {
            throw new \InvalidArgumentException('La telemetría requiere al menos 4 muestras.');
        }

        $pulse = $this->filter->zeroPhaseFourthOrder(array_map(fn ($s) => (float) ($s['pulse'] ?? 0), $samples));
        $spo2 = $this->filter->zeroPhaseFourthOrder(array_map(fn ($s) => (float) ($s['oxygenSaturation'] ?? 0), $samples));
        $rr = $this->filter->zeroPhaseFourthOrder(array_map(fn ($s) => (float) ($s['respiratoryRate'] ?? 0), $samples));
        $sbp = $this->filter->zeroPhaseFourthOrder(array_map(fn ($s) => (float) ($s['systolicBloodPressure'] ?? 0), $samples));
        $hasDbp = collect($samples)->contains(fn ($s) => isset($s['diastolicBloodPressure']));
        $dbp = $hasDbp
            ? $this->filter->zeroPhaseFourthOrder(array_map(fn ($s) => (float) ($s['diastolicBloodPressure'] ?? 0), $samples))
            : null;
        $temp = $this->filter->zeroPhaseFourthOrder(array_map(fn ($s) => (float) ($s['temperature'] ?? 0), $samples));
        $last = count($pulse) - 1;

        return $this->persistReading($encounterId, [
            'rr' => (int) round($rr[$last]),
            'spo2' => (int) round($spo2[$last]),
            'sbp' => (int) round($sbp[$last]),
            'dbp' => $dbp === null ? null : (int) round($dbp[$last]),
            'pulse' => (int) round($pulse[$last]),
            'temperature' => round($temp[$last], 1),
            'spo2_scale' => $payload['spo2Scale'] ?? 'scale1',
            'supplemental_oxygen' => (bool) ($payload['supplementalOxygen'] ?? false),
            'consciousness' => $payload['consciousness'] ?? 'alert',
        ], $user, filtered: true, activateAlerts: true);
    }

    /**
     * @return array{series: list<array<string, mixed>>}
     */
    public function chart(string $encounterId): array
    {
        $this->requireEncounter($encounterId);

        $series = VitalSignReading::query()
            ->where('encounter_id', $encounterId)
            ->orderBy('recorded_at')
            ->get()
            ->map(fn (VitalSignReading $row) => [
                'recordedAt' => optional($row->recorded_at)?->toIso8601String(),
                'respiratoryRate' => $row->rr,
                'oxygenSaturation' => $row->spo2,
                'systolicBloodPressure' => $row->sbp,
                'diastolicBloodPressure' => $row->dbp,
                'pulse' => $row->pulse,
                'temperature' => $row->temperature,
                'news2' => $row->news2_total,
            ])
            ->all();

        return ['series' => $series];
    }

    /**
     * @param  array<string, mixed>  $values
     * @return array<string, mixed>
     */
    private function persistReading(string $encounterId, array $values, ?User $user, bool $filtered, bool $activateAlerts): array
    {
        $news2 = $this->news2->calculate([
            'respiratoryRate' => $values['rr'],
            'oxygenSaturation' => $values['spo2'],
            'systolicBloodPressure' => $values['sbp'],
            'pulse' => $values['pulse'],
            'temperature' => $values['temperature'],
            'consciousness' => $values['consciousness'],
            'confusionOnset' => $values['confusion_onset'] ?? null,
            'supplementalOxygen' => $values['supplemental_oxygen'],
            'spo2Scale' => $values['spo2_scale'],
        ]);

        $reading = VitalSignReading::query()->create([
            'encounter_id' => $encounterId,
            'author_user_id' => $user?->id,
            'rr' => $values['rr'],
            'spo2' => $values['spo2'],
            'sbp' => $values['sbp'],
            'dbp' => $values['dbp'] ?? null,
            'pulse' => $values['pulse'],
            'temperature' => $values['temperature'],
            'spo2_scale' => $values['spo2_scale'],
            'supplemental_oxygen' => $values['supplemental_oxygen'],
            'consciousness' => $values['consciousness'],
            'news2_total' => $news2['total'],
            'recorded_at' => now(),
        ]);

        $alertActivated = false;
        $nextControlAt = null;

        if (! $activateAlerts) {
            // Revaloración dentro de una alerta abierta: no se duplica la
            // alerta ni se reprograma el control rutinario (RF-41).
            return $this->readingPayload($reading, $news2, $filtered, false, null);
        }

        if ($news2['total'] >= 1) {
            $this->alerts->openFromMonitoring($encounterId, (int) $news2['total'], $user);
            $alertActivated = true;
        } else {
            $hours = (int) config('vitalsy.alerts.routine_control_hours');
            $next = now()->addHours($hours);
            MonitoringSchedule::query()->updateOrCreate(
                ['encounter_id' => $encounterId],
                [
                    'next_due_at' => $next,
                    'frequency_minutes' => $hours * 60,
                    'created_by' => $user?->id,
                ],
            );
            $nextControlAt = $next->toIso8601String();
        }

        return $this->readingPayload($reading, $news2, $filtered, $alertActivated, $nextControlAt);
    }

    /**
     * @param  array<string, mixed>  $news2
     * @return array<string, mixed>
     */
    private function readingPayload(
        VitalSignReading $reading,
        array $news2,
        bool $filtered,
        bool $alertActivated,
        ?string $nextControlAt,
    ): array {
        return [
            'filtered' => $filtered,
            'alertActivated' => $alertActivated,
            'nextControlAt' => $nextControlAt,
            'reading' => [
                'id' => $reading->id,
                'respiratoryRate' => $reading->rr,
                'oxygenSaturation' => $reading->spo2,
                'systolicBloodPressure' => $reading->sbp,
                'diastolicBloodPressure' => $reading->dbp,
                'pulse' => $reading->pulse,
                'temperature' => (float) $reading->temperature,
                'news2' => $news2,
                'recordedAt' => optional($reading->recorded_at)?->toIso8601String(),
            ],
        ];
    }

    private function requireEncounter(string $encounterId): AdmissionEncounter
    {
        $encounter = AdmissionEncounter::query()->where('encounter_id', $encounterId)->first();
        if (! $encounter) {
            throw new NotFoundHttpException('No se encontró el ingreso.');
        }

        return $encounter;
    }
}
