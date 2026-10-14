<?php

namespace App\Observers;

use App\Events\ClinicalAlertRaised;
use App\Events\ClinicalAlertUpdated;
use App\Models\AdmissionEncounter;
use App\Models\ClinicalAlert;
use App\Models\User;
use App\Services\ClinicalAlerts\AlertAudience;
use App\Services\ClinicalAlerts\AlertWorkflow;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Único punto por el que pasa toda alerta persistida (monitoreo NEWS2,
 * observación, escalamientos, acuses, cierres): despacha el push en tiempo real.
 * Un fallo del transporte nunca debe romper el flujo clínico.
 */
class ClinicalAlertObserver
{
    private const WATCHED = [
        'status', 'assigned_role', 'assigned_user_id', 'news2_total', 'severity',
        'acknowledge_due_at', 'follow_up_due_at', 'closed_at',
    ];

    public function created(ClinicalAlert $alert): void
    {
        $this->safely(function () use ($alert) {
            foreach (AlertAudience::recipients($alert) as $user) {
                event(new ClinicalAlertRaised($user->id, $this->payload($alert, $user)));
            }
        });
    }

    public function updated(ClinicalAlert $alert): void
    {
        if (! $alert->wasChanged(self::WATCHED)) {
            return;
        }

        $this->safely(function () use ($alert) {
            $before = (new ClinicalAlert)->forceFill($alert->getOriginal());
            $now = AlertAudience::recipients($alert);
            $previous = AlertAudience::recipients($before);
            $previousIds = $previous->pluck('id')->all();

            $raisedIds = [];
            foreach ($now as $user) {
                if (! in_array($user->id, $previousIds, true)) {
                    $raisedIds[] = $user->id;
                    event(new ClinicalAlertRaised($user->id, $this->payload($alert, $user)));
                }
            }

            foreach ($now->merge($previous)->unique('id') as $user) {
                if (! in_array($user->id, $raisedIds, true)) {
                    event(new ClinicalAlertUpdated($user->id, $this->payload($alert, $user)));
                }
            }
        });
    }

    /** @return array<string, mixed> */
    private function payload(ClinicalAlert $alert, User $user): array
    {
        $encounter = AdmissionEncounter::query()->where('encounter_id', $alert->encounter_id)->first();
        $parts = $encounter === null ? [] : array_filter([
            $encounter->room ? "Habitación {$encounter->room}" : null,
            $encounter->bed ? "lecho {$encounter->bed}" : null,
        ]);
        $location = $parts === [] ? null : implode(', ', $parts);

        return [
            'alertId' => $alert->id,
            'severity' => $alert->severity,
            'news2Total' => $alert->news2_total,
            'encounterId' => $alert->encounter_id,
            'location' => $location,
            'status' => $alert->status,
            'createdAt' => optional($alert->generated_at)?->toIso8601String(),
            'needsSiren' => app(AlertWorkflow::class)->present($alert, $user)['needsSiren'],
        ];
    }

    private function safely(callable $callback): void
    {
        try {
            $callback();
        } catch (Throwable $exception) {
            Log::warning('No se pudo emitir la alerta en tiempo real.', ['error' => $exception->getMessage()]);
        }
    }
}
