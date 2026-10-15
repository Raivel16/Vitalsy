<?php

namespace App\Services\ClinicalAlerts;

use App\Models\AdmissionEncounter;
use App\Models\ClinicalAlert;
use App\Models\User;

/** Representación de una alerta para la bandeja y la línea de tiempo. */
class AlertPresenter
{
    public function __construct(private readonly AlertSirenPolicy $siren) {}

    /** @return array<string, mixed> */
    public function present(ClinicalAlert $alert, ?User $viewer = null): array
    {
        $encounter = AdmissionEncounter::query()->where('encounter_id', $alert->encounter_id)->first();

        return [
            'id' => $alert->id,
            'encounterId' => $alert->encounter_id,
            'patientName' => $encounter?->patient_name,
            'location' => $this->location($encounter),
            'source' => $alert->source,
            'severity' => $alert->severity,
            'news2Total' => $alert->news2_total,
            'message' => $alert->message,
            'status' => $alert->status,
            'assignedRole' => $alert->assigned_role,
            'generatedAt' => optional($alert->generated_at)?->toIso8601String(),
            'acknowledgeDueAt' => optional($alert->acknowledge_due_at)?->toIso8601String(),
            'followUpDueAt' => optional($alert->follow_up_due_at)?->toIso8601String(),
            'reassessedAt' => optional($alert->reassessed_at)?->toIso8601String(),
            'medicalDueAt' => optional($alert->medical_due_at)?->toIso8601String(),
            'closedAt' => optional($alert->closed_at)?->toIso8601String(),
            'needsSiren' => $this->siren->needsSiren($alert, $viewer),
            'complianceKey' => $alert->compliance_key,
            'icuTransfer' => [
                'ordered' => $alert->icu_ordered_at !== null,
                'orderedAt' => optional($alert->icu_ordered_at)?->toIso8601String(),
                'doctorAuthorized' => $alert->icu_doctor_authorized_at !== null,
                'doctorAuthorizedAt' => optional($alert->icu_doctor_authorized_at)?->toIso8601String(),
                'nurseAuthorized' => $alert->icu_nurse_authorized_at !== null,
                'nurseAuthorizedAt' => optional($alert->icu_nurse_authorized_at)?->toIso8601String(),
                'fullyAuthorized' => $alert->icuFullyAuthorized(),
                'transferredAt' => optional($alert->icu_transferred_at)?->toIso8601String(),
                'returnedAt' => optional($alert->icu_returned_at)?->toIso8601String(),
                'previousLocation' => array_filter([
                    'service' => $alert->icu_previous_service,
                    'room' => $alert->icu_previous_room,
                    'bed' => $alert->icu_previous_bed,
                ]) ?: null,
            ],
        ];
    }

    private function location(?AdmissionEncounter $encounter): ?string
    {
        if (! $encounter) {
            return null;
        }

        $parts = array_filter([
            $encounter->room ? "Habitación {$encounter->room}" : null,
            $encounter->bed ? "lecho {$encounter->bed}" : null,
        ]);

        return $parts === [] ? null : implode(', ', $parts);
    }
}
