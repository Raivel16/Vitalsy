<?php

namespace App\Services\BedManagement;

use App\Models\Bed;
use App\Models\BedRequest;
use App\Models\CleaningOrder;

/** Representación de camas, solicitudes de cama y órdenes de limpieza. */
class BedPresenter
{
    /** @return array<string, mixed> */
    public function bed(Bed $bed): array
    {
        return [
            'id' => $bed->id,
            'ward' => $bed->ward?->name,
            'room' => $bed->room,
            'bedCode' => $bed->bed_code,
            'genderPolicy' => $bed->gender_policy,
            'isolation' => $bed->isolation,
            'status' => $bed->status,
        ];
    }

    /** @return array<string, mixed> */
    public function request(BedRequest $request): array
    {
        return [
            'id' => $request->id,
            'encounterId' => $request->encounter_id,
            'patientName' => $request->patient_name,
            'source' => $request->source,
            'priority' => $request->priority,
            'specialty' => $request->specialty,
            'gender' => $request->gender,
            'isolation' => $request->isolation,
            'isolationType' => $request->isolation_type,
            'equipment' => $request->equipment ?? [],
            'status' => $request->status,
            'requestedAt' => optional($request->requested_at)?->toIso8601String(),
        ];
    }

    /** @return array<string, mixed> */
    public function cleaning(CleaningOrder $order): array
    {
        return [
            'id' => $order->id,
            'bedId' => $order->bed_id,
            'room' => $order->bed?->room,
            'bedCode' => $order->bed?->bed_code,
            'ward' => $order->bed?->ward?->name,
            'isolation' => (bool) $order->bed?->isolation,
            'protocol' => $order->protocol,
            'status' => $order->status,
            'checklist' => $order->checklist ?? (object) [],
            'dispatchedAt' => optional($order->dispatched_at)?->toIso8601String(),
            'completedAt' => optional($order->completed_at)?->toIso8601String(),
            'equippedAt' => optional($order->equipped_at)?->toIso8601String(),
            'enabledAt' => optional($order->enabled_at)?->toIso8601String(),
        ];
    }
}
