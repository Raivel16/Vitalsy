<?php

namespace App\Services\BedManagement;

use App\Exceptions\ClinicalRuleException;
use App\Models\AdmissionEncounter;
use App\Models\Bed;
use App\Models\BedAssignment;
use App\Models\BedRequest;
use App\Models\CleaningOrder;
use App\Models\DischargeProjection;
use App\Models\User;
use App\Models\Ward;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class BedManagement
{
    private const PRIORITY_WEIGHT = [
        'critica' => 4,
        'alta' => 3,
        'media' => 2,
        'baja' => 1,
    ];

    public function __construct(private readonly CleaningWorkflow $cleaning) {}

    public function available(): array
    {
        $beds = Bed::query()
            ->with('ward')
            ->where('status', 'available')
            ->orderBy('room')
            ->orderBy('bed_code')
            ->get();

        return [
            'count' => $beds->count(),
            'beds' => $beds->map(fn (Bed $bed) => $this->presentBed($bed))->values()->all(),
        ];
    }

    public function census(): array
    {
        $wards = Ward::query()->with('beds')->orderBy('code')->get()->map(function (Ward $ward) {
            $beds = $ward->beds->map(fn (Bed $bed) => $this->presentBed($bed));

            return [
                'id' => $ward->id,
                'code' => $ward->code,
                'name' => $ward->name,
                'specialty' => $ward->specialty,
                'available' => $ward->beds->where('status', 'available')->count(),
                'occupied' => $ward->beds->where('status', 'occupied')->count(),
                'cleaning' => $ward->beds->where('status', 'cleaning')->count(),
                'beds' => $beds->values(),
            ];
        });

        return ['wards' => $wards->values()];
    }

    /** @param array<string, mixed> $data */
    public function storeRequest(array $data): array
    {
        $suggestions = $this->suggestBeds($data);
        $status = $suggestions === [] ? 'en_espera' : 'pendiente';

        $request = BedRequest::query()->create([
            'encounter_id' => $data['encounterId'] ?? null,
            'patient_name' => $data['patientName'] ?? null,
            'source' => $data['source'],
            'priority' => $data['priority'],
            'specialty' => $data['specialty'] ?? null,
            'gender' => $data['gender'] ?? null,
            'isolation' => (bool) ($data['isolation'] ?? false),
            'status' => $status,
            'requested_at' => now(),
        ]);

        return ['request' => $this->presentRequest($request), 'suggestions' => $suggestions];
    }

    public function listRequests(?string $status = null): array
    {
        $query = BedRequest::query();
        if ($status) {
            $query->where('status', $status);
        }

        $requests = $query->get()
            ->sortByDesc(fn (BedRequest $request) => self::PRIORITY_WEIGHT[$request->priority] ?? 0)
            ->values()
            ->map(fn (BedRequest $request) => $this->presentRequest($request));

        return ['requests' => $requests];
    }

    public function suggestions(int $requestId): array
    {
        $request = $this->requireRequest($requestId);

        return ['suggestions' => $this->suggestBeds([
            'isolation' => $request->isolation,
            'gender' => $request->gender,
            'specialty' => $request->specialty,
        ])];
    }

    public function assign(int $requestId, int $bedId): array
    {
        $request = $this->requireRequest($requestId);
        $bed = Bed::query()->with('ward')->find($bedId);
        if (! $bed) {
            throw new NotFoundHttpException('No se encontró el lecho.');
        }
        if ($bed->status !== 'available') {
            throw new ClinicalRuleException('El lecho ya no está disponible.');
        }

        $bed->update(['status' => 'occupied']);
        $assignment = BedAssignment::query()->create([
            'bed_id' => $bed->id,
            'encounter_id' => $request->encounter_id ?? "REQ-{$request->id}",
            'assigned_at' => now(),
        ]);
        $request->update(['status' => 'asignada']);

        if ($request->encounter_id) {
            AdmissionEncounter::query()->where('encounter_id', $request->encounter_id)->update([
                'room' => $bed->room,
                'bed' => $bed->bed_code,
                'service' => $bed->ward?->name,
            ]);
        }

        return [
            'assignment' => [
                'id' => $assignment->id,
                'bedId' => $bed->id,
                'encounterId' => $assignment->encounter_id,
            ],
        ];
    }

    /** @param array<string, mixed> $checklist */
    public function completeCleaning(int $orderId, array $checklist, User $user): array
    {
        $order = $this->cleaning->complete($orderId, $checklist, $user);

        return ['order' => $this->presentCleaning($order->load('bed.ward'))];
    }

    public function markEquipped(int $bedId, User $user): array
    {
        $bed = $this->requireBed($bedId);
        $result = $this->cleaning->equip($bed, $user);

        return [
            'bed' => $this->presentBed($bed->fresh('ward')),
            'order' => $this->presentCleaning($result['order']->load('bed.ward')),
        ];
    }

    public function release(int $bedId, User $user): array
    {
        $bed = $this->requireBed($bedId);
        $order = $this->cleaning->enable($bed, $user);

        return [
            'bed' => $this->presentBed($bed->fresh('ward')),
            'order' => $this->presentCleaning($order->load('bed.ward')),
        ];
    }

    /** @param array<string, mixed> $data */
    public function storeProjection(array $data, User $user): array
    {
        $projection = DischargeProjection::query()->create([
            'encounter_id' => $data['encounterId'],
            'projected_at' => $data['projectedAt'],
            'noted_by' => $user->id,
        ]);

        return [
            'projection' => [
                'id' => $projection->id,
                'encounterId' => $projection->encounter_id,
                'projectedAt' => optional($projection->projected_at)?->toIso8601String(),
            ],
        ];
    }

    public function listCleaning(): array
    {
        $orders = CleaningOrder::query()->with('bed.ward')->orderByDesc('id')->get()
            ->map(fn (CleaningOrder $order) => $this->presentCleaning($order));

        return ['orders' => $orders->values()];
    }

    public function vacateEncounter(string $encounterId): void
    {
        $assignment = BedAssignment::query()
            ->where('encounter_id', $encounterId)
            ->whereNull('released_at')
            ->latest('id')
            ->first();
        if (! $assignment) {
            return;
        }

        $bed = $assignment->bed;
        $assignment->update(['released_at' => now()]);
        $bed?->update(['status' => 'cleaning']);

        CleaningOrder::query()->create([
            'bed_id' => $assignment->bed_id,
            'protocol' => $bed?->isolation ? 'deep' : 'standard',
            'status' => 'pendiente',
            'dispatched_at' => now(),
        ]);
    }

    /** @param array<string, mixed> $profile */
    private function suggestBeds(array $profile): array
    {
        $query = Bed::query()->with('ward')->where('status', 'available');
        if ($profile['isolation'] ?? false) {
            $query->where('isolation', true);
        } else {
            $query->where('isolation', false);
        }
        if (! empty($profile['specialty'])) {
            $query->whereHas('ward', fn ($ward) => $ward->where('specialty', $profile['specialty']));
        }
        if (! empty($profile['gender'])) {
            $query->where(function ($beds) use ($profile) {
                $beds->where('gender_policy', 'mixed')->orWhere('gender_policy', $profile['gender']);
            });
        }

        return $query->get()->map(fn (Bed $bed) => $this->presentBed($bed))->values()->all();
    }

    private function presentBed(Bed $bed): array
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

    private function presentRequest(BedRequest $request): array
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
            'status' => $request->status,
            'requestedAt' => optional($request->requested_at)?->toIso8601String(),
        ];
    }

    private function presentCleaning(CleaningOrder $order): array
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

    private function requireRequest(int $id): BedRequest
    {
        $request = BedRequest::query()->find($id);
        if (! $request) {
            throw new NotFoundHttpException('No se encontró la solicitud de cama.');
        }

        return $request;
    }

    private function requireBed(int $id): Bed
    {
        $bed = Bed::query()->with('ward')->find($id);
        if (! $bed) {
            throw new NotFoundHttpException('No se encontró el lecho.');
        }

        return $bed;
    }
}
