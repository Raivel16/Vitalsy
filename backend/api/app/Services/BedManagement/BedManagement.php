<?php

namespace App\Services\BedManagement;

use App\Exceptions\ClinicalRuleException;
use App\Models\AdmissionEncounter;
use App\Models\Bed;
use App\Models\BedAssignment;
use App\Models\BedRequest;
use App\Models\CleaningOrder;
use App\Models\DischargeProjection;
use App\Models\Patient;
use App\Models\User;
use App\Models\Ward;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class BedManagement
{
    private const PRIORITY_WEIGHT = [
        'critica' => 4,
        'alta' => 3,
        'media' => 2,
        'baja' => 1,
    ];

    private const ISOLATING_TYPES = ['gotas', 'contacto', 'respiratorio'];

    public function __construct(
        private readonly CleaningWorkflow $cleaning,
        private readonly BedCompatibility $compatibility,
    ) {}

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
        $encounter = isset($data['encounterId'])
            ? AdmissionEncounter::query()->where('encounter_id', $data['encounterId'])->first()
            : null;

        $isolationType = $data['isolationType'] ?? null;
        $isolation = (bool) ($data['isolation'] ?? false) || in_array($isolationType, self::ISOLATING_TYPES, true);
        $profile = [
            'isolation' => $isolation,
            'gender' => $data['gender'] ?? ($encounter ? $this->genderOf($encounter) : null),
            'specialty' => $data['specialty'] ?? null,
        ];

        $suggestions = $this->suggestBeds($profile);

        $request = BedRequest::query()->create([
            'encounter_id' => $data['encounterId'] ?? null,
            'patient_name' => $data['patientName'] ?? $encounter?->patient_name,
            'source' => $data['source'],
            'priority' => $data['priority'],
            'specialty' => $profile['specialty'],
            'gender' => $profile['gender'],
            'isolation' => $isolation,
            'isolation_type' => $isolationType ?? ($isolation ? null : 'ninguno'),
            'equipment' => $data['equipment'] ?? [],
            'status' => $suggestions === [] ? 'en_espera' : 'pendiente',
            'requested_at' => now(),
        ]);

        return ['request' => $this->presentRequest($request), 'suggestions' => $suggestions];
    }

    /** Estados separados por coma, p. ej. `pendiente,en_espera`. */
    public function listRequests(?string $status = null): array
    {
        $query = BedRequest::query();
        if ($status) {
            $query->whereIn('status', array_filter(array_map('trim', explode(',', $status))));
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

    /** RF-72/73: valida compatibilidad, asigna de forma atómica y notifica a la supervisora. */
    public function assign(int $requestId, int $bedId): array
    {
        return DB::transaction(function () use ($requestId, $bedId) {
            $request = $this->requireRequest($requestId);
            if (! in_array($request->status, ['pendiente', 'en_espera'], true)) {
                throw new ClinicalRuleException('La solicitud ya fue atendida.');
            }

            $bed = Bed::query()->with('ward')->lockForUpdate()->find($bedId);
            if (! $bed) {
                throw new NotFoundHttpException('No se encontró el lecho.');
            }
            if ($bed->status !== 'available') {
                throw new ClinicalRuleException('El lecho ya no está disponible.');
            }

            $violations = $this->compatibility->violations($bed, [
                'isolation' => $request->isolation,
                'gender' => $request->gender,
                'specialty' => $request->specialty,
            ]);
            if ($violations !== []) {
                throw new ClinicalRuleException('El lecho no es compatible con el paciente: '.implode(' ', $violations));
            }

            $bed->update(['status' => 'occupied']);
            $assignment = BedAssignment::query()->create([
                'bed_id' => $bed->id,
                'encounter_id' => $request->encounter_id ?? "REQ-{$request->id}",
                'assigned_at' => now(),
                'notified_at' => now(),
                'notified_role' => 'enfermera_supervisora',
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
                    'notifiedRole' => $assignment->notified_role,
                ],
            ];
        });
    }

    /** RF-73: asignaciones notificadas a la supervisora y aún no reconocidas. */
    public function notifications(): array
    {
        $rows = BedAssignment::query()
            ->with('bed.ward')
            ->where('notified_role', 'enfermera_supervisora')
            ->whereNull('acknowledged_at')
            ->orderBy('assigned_at')
            ->get();

        return ['notifications' => $rows->map(fn (BedAssignment $assignment) => [
            'id' => $assignment->id,
            'encounterId' => $assignment->encounter_id,
            'patientName' => $this->patientNameFor($assignment->encounter_id),
            'ward' => $assignment->bed?->ward?->name,
            'room' => $assignment->bed?->room,
            'bedCode' => $assignment->bed?->bed_code,
            'assignedAt' => optional($assignment->assigned_at)?->toIso8601String(),
        ])->values()->all()];
    }

    public function acknowledge(int $assignmentId, User $user): array
    {
        $assignment = BedAssignment::query()->find($assignmentId);
        if (! $assignment) {
            throw new NotFoundHttpException('No se encontró la asignación.');
        }

        if (! $assignment->acknowledged_at) {
            $assignment->update(['acknowledged_at' => now(), 'acknowledged_by' => $user->id]);
        }

        return ['acknowledged' => true, 'id' => $assignment->id];
    }

    /** Ingresos abiertos sin cama ni solicitud vigente: origen del selector de pacientes (RF-68). */
    public function patients(?string $query = null): array
    {
        $withBed = BedAssignment::query()->whereNull('released_at')->pluck('encounter_id');
        $withRequest = BedRequest::query()
            ->whereIn('status', ['pendiente', 'en_espera'])
            ->whereNotNull('encounter_id')
            ->pluck('encounter_id');

        $encounters = AdmissionEncounter::query()
            ->where('current_step', '!=', 'egresado')
            ->whereNotIn('encounter_id', $withBed->merge($withRequest)->all())
            ->when($query, function ($builder, string $term) {
                $like = '%'.addcslashes($term, '%_\\').'%';
                $builder->where(function ($inner) use ($like) {
                    $inner->where('patient_name', 'like', $like)->orWhere('document_number', 'like', $like);
                });
            })
            ->orderBy('patient_name')
            ->limit(25)
            ->get();

        $sexByDocument = Patient::query()
            ->whereIn('document_number', $encounters->pluck('document_number')->all())
            ->get()
            ->mapWithKeys(fn (Patient $patient) => [$patient->document_type.'|'.$patient->document_number => $patient->sex]);

        return ['patients' => $encounters->map(fn (AdmissionEncounter $encounter) => [
            'encounterId' => $encounter->encounter_id,
            'patientName' => $encounter->patient_name,
            'documentNumber' => $encounter->document_number,
            'originService' => $encounter->origin_service,
            'gender' => $this->normalizeGender($sexByDocument[$encounter->document_type.'|'.$encounter->document_number] ?? null),
        ])->values()->all()];
    }

    /** RF-71: proyecciones de alta vigentes (hoy en adelante). */
    public function listProjections(): array
    {
        $rows = DischargeProjection::query()
            ->where('projected_at', '>=', now()->startOfDay())
            ->orderBy('projected_at')
            ->get();
        $names = AdmissionEncounter::query()
            ->whereIn('encounter_id', $rows->pluck('encounter_id')->all())
            ->pluck('patient_name', 'encounter_id');

        return ['projections' => $rows->map(fn (DischargeProjection $projection) => [
            'id' => $projection->id,
            'encounterId' => $projection->encounter_id,
            'patientName' => $names[$projection->encounter_id] ?? null,
            'projectedAt' => optional($projection->projected_at)?->toIso8601String(),
        ])->values()->all()];
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
        return array_map(fn (Bed $bed) => $this->presentBed($bed), $this->compatibility->suggest($profile));
    }

    private function genderOf(AdmissionEncounter $encounter): ?string
    {
        $sex = Patient::query()
            ->where('document_type', $encounter->document_type)
            ->where('document_number', $encounter->document_number)
            ->value('sex');

        return $this->normalizeGender($sex);
    }

    /** `Femenino`/`F`/`female` → `female`; `Masculino`/`M`/`male` → `male`; otro → null. */
    private function normalizeGender(?string $sex): ?string
    {
        $initial = strtolower(substr(trim((string) $sex), 0, 1));

        return match ($initial) {
            'f' => 'female',
            'm' => 'male',
            default => null,
        };
    }

    private function patientNameFor(string $encounterId): ?string
    {
        if (str_starts_with($encounterId, 'REQ-')) {
            return BedRequest::query()->find((int) substr($encounterId, 4))?->patient_name;
        }

        return AdmissionEncounter::query()->where('encounter_id', $encounterId)->value('patient_name');
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
            'isolationType' => $request->isolation_type,
            'equipment' => $request->equipment ?? [],
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
