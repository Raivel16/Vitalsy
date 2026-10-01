<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdmissionEncounter;
use App\Models\User;
use App\Services\Admission\AdmissionBoard;
use App\Services\Admission\AdmissionBoardException;
use App\Services\Clinical\BradenScale;
use App\Services\Clinical\MorseFallScale;
use App\Services\Clinical\News2Calculator;
use App\Services\InpatientCare\CpoeService;
use App\Services\InpatientCare\VitalSignsMonitoring;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class HospitalAdmissionController extends Controller
{
    public function __construct(
        private readonly AdmissionBoard $board,
        private readonly News2Calculator $news2,
        private readonly MorseFallScale $morse,
        private readonly BradenScale $braden,
        private readonly VitalSignsMonitoring $monitoring,
        private readonly CpoeService $cpoe,
    ) {}

    public function showAdmissionOrder(string $orderNumber): JsonResponse
    {
        $order = $this->board->findOrder($orderNumber);
        if (! $order) {
            return $this->missing('No se encontró la orden.');
        }

        return response()->json(['order' => $order]);
    }

    public function validateFiliation(Request $request): JsonResponse
    {
        $data = $request->validate([
            'fullName' => ['required', 'string'],
            'documentNumber' => ['required', 'string'],
            'birthDate' => ['nullable', 'date'],
            'confirmed' => ['accepted'],
            'encounterId' => ['nullable', 'string'],
        ]);

        if (! empty($data['encounterId'])) {
            $this->board->putClinical($data['encounterId'], 'filiation', [
                'fullName' => $data['fullName'],
                'documentNumber' => $data['documentNumber'],
                'birthDate' => $data['birthDate'] ?? null,
                'confirmed' => true,
            ]);
        }

        return response()->json([
            'validated' => true,
            'patient' => ['fullName' => $data['fullName'], 'documentNumber' => $data['documentNumber']],
        ]);
    }

    public function validateCoverage(Request $request): JsonResponse
    {
        $data = $request->validate(['orderNumber' => ['required', 'string']]);
        $order = $this->board->findOrder($data['orderNumber']);
        if (! $order) {
            return $this->missing('No se encontró la orden.');
        }

        return response()->json(['coverage' => $order['coverage']]);
    }

    public function referCoverage(Request $request): JsonResponse
    {
        $data = $request->validate([
            'encounterId' => ['nullable', 'string'],
            'destination' => ['required', 'in:caja,trabajo_social'],
            'relativeName' => ['required', 'string'],
            'relativePhone' => ['required', 'regex:/^\d{7,15}$/'],
            'note' => ['nullable', 'string'],
        ]);

        $referral = [
            'destination' => $data['destination'],
            'relativeName' => $data['relativeName'],
            'relativePhone' => $data['relativePhone'],
            'note' => $data['note'] ?? null,
        ];

        if (! empty($data['encounterId'])) {
            return $this->guard(fn () => response()->json([
                'referral' => $this->board->storeReferral($data['encounterId'], $referral),
            ], 201));
        }

        return response()->json([
            'referral' => [
                'destination' => $data['destination'],
                'status' => 'derivado',
                'relativeName' => $data['relativeName'],
            ],
        ], 201);
    }

    public function issueWristband(Request $request): JsonResponse
    {
        $data = $request->validate(['encounterId' => ['required', 'string']]);

        return $this->guard(fn () => response()->json([
            'wristband' => $this->board->issueWristband($data['encounterId']),
        ], 201));
    }

    public function openRecord(Request $request): JsonResponse
    {
        $data = $request->validate(['encounterId' => ['required', 'string']]);

        return $this->guard(fn () => response()->json([
            'record' => $this->board->openRecord($data['encounterId']),
        ], 201));
    }

    public function storeConsent(Request $request): JsonResponse
    {
        $data = $request->validate([
            'encounterId' => ['required', 'string'],
            'signerName' => ['required', 'string'],
            'accepted' => ['accepted'],
            'relationship' => ['nullable', 'string'],
        ]);

        return $this->guard(fn () => response()->json([
            'consent' => $this->board->storeConsent($data['encounterId'], [
                'signerName' => $data['signerName'],
                'relationship' => $data['relationship'] ?? null,
            ]),
        ], 201));
    }

    public function showTransferOrder(string $orderNumber): JsonResponse
    {
        return $this->guard(fn () => response()->json([
            'transfer' => $this->board->findTransfer($orderNumber),
        ]));
    }

    public function verifyWristband(Request $request): JsonResponse
    {
        $data = $request->validate(['code' => ['required', 'string']]);

        return $this->guard(function () use ($data) {
            try {
                return response()->json(['identity' => $this->board->verifyWristband($data['code'])]);
            } catch (AdmissionBoardException $exception) {
                return response()->json(['message' => $exception->getMessage()], $exception->status);
            }
        });
    }

    public function confirmReception(Request $request): JsonResponse
    {
        $data = $request->validate([
            'encounterId' => ['required', 'string'],
            'confirmed' => ['accepted'],
        ]);

        return $this->guard(function () use ($data) {
            $this->board->putClinical($data['encounterId'], 'reception', ['status' => 'ingresado']);

            return response()->json(['reception' => ['status' => 'ingresado']], 201);
        });
    }

    public function relocate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'encounterId' => ['required', 'string'],
            'reason' => ['required', 'string'],
            'requestedRoom' => ['required', 'string'],
            'requestedBed' => ['required', 'string'],
        ]);

        return $this->guard(function () use ($data) {
            $this->board->putClinical($data['encounterId'], 'relocation', $data);

            return response()->json([
                'relocation' => [
                    'status' => 'notificada',
                    'room' => $data['requestedRoom'],
                    'bed' => $data['requestedBed'],
                ],
            ], 201);
        });
    }

    public function storeAssessment(Request $request): JsonResponse
    {
        $data = $request->validate([
            'encounterId' => ['nullable', 'string'],
            'chiefComplaint' => ['required', 'string'],
            'allergies' => ['nullable', 'array'],
            'history' => ['nullable', 'string'],
        ]);

        if (! empty($data['encounterId'])) {
            return $this->guard(function () use ($data) {
                $this->board->putClinical($data['encounterId'], 'assessment', [
                    'chiefComplaint' => $data['chiefComplaint'],
                    'allergies' => $data['allergies'] ?? [],
                    'history' => $data['history'] ?? null,
                    'status' => 'registrada',
                ]);

                return response()->json(['assessment' => ['status' => 'registrada']], 201);
            });
        }

        return response()->json(['assessment' => ['status' => 'registrada']], 201);
    }

    public function storeVitalSigns(Request $request): JsonResponse
    {
        $data = $request->validate([
            'encounterId' => ['nullable', 'string'],
            'respiratoryRate' => ['required', 'numeric'],
            'oxygenSaturation' => ['required', 'numeric'],
            'systolicBloodPressure' => ['required', 'numeric'],
            'diastolicBloodPressure' => ['required', 'numeric'],
            'pulse' => ['required', 'numeric'],
            'temperature' => ['required', 'numeric'],
            'spo2Scale' => ['nullable', 'in:scale1,scale2'],
            'supplementalOxygen' => ['nullable', 'boolean'],
            'consciousness' => ['nullable', 'in:alert,confusion,voice,pain,unresponsive'],
            'confusionOnset' => ['nullable', 'in:new,chronic'],
        ], [
            'respiratoryRate.required' => 'La frecuencia respiratoria es obligatoria.',
            'oxygenSaturation.required' => 'La saturación es obligatoria.',
            'systolicBloodPressure.required' => 'La presión sistólica es obligatoria.',
            'diastolicBloodPressure.required' => 'La presión diastólica es obligatoria.',
            'pulse.required' => 'El pulso es obligatorio.',
            'temperature.required' => 'La temperatura es obligatoria.',
        ]);

        if ($message = $this->implausible($data)) {
            return response()->json(['message' => $message], 422);
        }

        $news2 = $this->news2->calculate($data);
        $alertActivated = false;
        $nextControlAt = null;
        if (! empty($data['encounterId'])) {
            $summary = sprintf(
                'FR %s, SpO2 %s %%, PA %s/%s, pulso %s, %s °C',
                $data['respiratoryRate'],
                $data['oxygenSaturation'],
                $data['systolicBloodPressure'],
                $data['diastolicBloodPressure'],
                $data['pulse'],
                $data['temperature'],
            );
            // El ingreso debe existir antes de persistir la lectura (storeManual).
            $this->board->putClinical($data['encounterId'], 'vitals', [
                'input' => $data,
                'news2' => $news2,
                'summary' => $summary,
                'news2Label' => ($news2['total'] ?? 0).' puntos, '.strtolower((string) ($news2['visualLabel'] ?? 'riesgo')),
            ]);

            $actor = $request->user();
            $stored = $this->monitoring->storeManual(
                $data['encounterId'],
                $data,
                $actor instanceof User ? $actor : null,
            );
            $news2 = $stored['reading']['news2'];
            $alertActivated = (bool) $stored['alertActivated'];
            $nextControlAt = $stored['nextControlAt'];
            $this->board->putClinical($data['encounterId'], 'vitals', [
                'input' => $data,
                'news2' => $news2,
                'summary' => $summary,
                'news2Label' => ($news2['total'] ?? 0).' puntos, '.strtolower((string) ($news2['visualLabel'] ?? 'riesgo')),
            ]);
        }

        return response()->json([
            'news2' => $news2,
            'alertActivated' => $alertActivated,
            'nextControlAt' => $nextControlAt,
        ], 201);
    }

    public function storeReconciliation(Request $request): JsonResponse
    {
        $data = $request->validate([
            'encounterId' => ['nullable', 'string'],
            'allergies' => ['nullable', 'string'],
            'medications' => ['present', 'array'],
            'medications.*.name' => ['required', 'string'],
            'noHomeMedications' => ['sometimes', 'boolean'],
            'notes' => ['nullable', 'string'],
        ]);

        $alerts = [];
        foreach ($data['medications'] as $medication) {
            if (preg_match('/penicil/i', (string) ($data['allergies'] ?? '')) && preg_match('/amoxicil|ampicil|penicil/i', $medication['name'])) {
                $alerts[] = 'Posible alergia: '.$medication['name'].' coincide con alergia a penicilina.';
            }
        }

        $noneDeclared = (bool) ($data['noHomeMedications'] ?? false);
        $status = $alerts === [] ? 'validada' : 'con_observaciones';
        $statusLabel = $status === 'validada'
            ? ($noneDeclared && $data['medications'] === [] ? 'Validada: sin medicación habitual' : 'Validada')
            : 'Con observaciones';
        $reconciliation = [
            'status' => $status,
            'statusLabel' => $statusLabel,
            'alerts' => $alerts,
            'allergies' => $data['allergies'] ?? null,
            'medications' => $data['medications'],
            'noHomeMedications' => $noneDeclared,
            'notes' => $data['notes'] ?? null,
        ];

        if (! empty($data['encounterId'])) {
            $this->board->putClinical($data['encounterId'], 'reconciliation', $reconciliation);
        }

        return response()->json(['reconciliation' => $reconciliation], 201);
    }

    public function storeRiskScales(Request $request): JsonResponse
    {
        $data = $request->validate([
            'encounterId' => ['nullable', 'string'],
            'morse' => ['required', 'array'],
            'braden' => ['required', 'array'],
        ]);

        try {
            $pressure = $this->braden->calculate($data['braden']);
        } catch (InvalidArgumentException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        $morse = $this->morse->calculate($data['morse']);
        if (! empty($data['encounterId'])) {
            $this->board->putClinical($data['encounterId'], 'risks', [
                'morse' => $morse,
                'braden' => $pressure,
                'fallRisk' => ($morse['levelLabel'] ?? 'Riesgo').', '.($morse['total'] ?? 0).' puntos',
                'pressureRisk' => ($pressure['levelLabel'] ?? 'Riesgo').', '.($pressure['total'] ?? 0).' puntos',
            ]);
        }

        return response()->json([
            'status' => 'registrada',
            'morse' => $morse,
            'braden' => $pressure,
        ], 201);
    }

    public function showKardex(string $encounterId): JsonResponse
    {
        return $this->guard(fn () => response()->json([
            'kardex' => $this->board->kardex($encounterId),
        ]));
    }

    public function showMedicalOrders(string $encounterId): JsonResponse
    {
        return $this->guard(fn () => response()->json([
            'orders' => $this->board->medicalOrders($encounterId),
        ]));
    }

    public function saveMedicalOrders(Request $request, string $encounterId): JsonResponse
    {
        $data = $request->validate([
            'items' => ['present', 'array'],
            'items.*.title' => ['nullable', 'string'],
            'items.*.detail' => ['nullable', 'string'],
            'items.*.category' => ['nullable', 'string'],
        ]);

        return $this->guard(fn () => response()->json([
            'orders' => $this->board->saveMedicalOrders($encounterId, $data['items']),
        ]));
    }

    public function signMedicalOrders(Request $request, string $encounterId): JsonResponse
    {
        $data = $request->validate([
            'physicianName' => ['required', 'string'],
            'credential' => ['required', 'string'],
            'confirmed' => ['accepted'],
            'items' => ['nullable', 'array'],
            'items.*.title' => ['nullable', 'string'],
            'items.*.detail' => ['nullable', 'string'],
            'items.*.category' => ['nullable', 'string'],
        ]);

        return $this->guard(function () use ($data, $encounterId, $request) {
            $signature = $this->board->signMedicalOrders($encounterId, [
                'physicianName' => $data['physicianName'],
                'credential' => $data['credential'],
                'items' => $data['items'] ?? null,
            ]);
            $this->openBasalPlanFromBpmh($encounterId, $request->user());

            return response()->json(['signature' => $signature], 201);
        });
    }

    /**
     * La firma de indicaciones (RF-16) convierte el BPMH en el plan CPOE basal.
     * Los ítems libres de la hoja no se tratan como fármacos.
     */
    private function openBasalPlanFromBpmh(string $encounterId, mixed $actor): void
    {
        if (! $actor instanceof User) {
            return;
        }

        $encounter = AdmissionEncounter::query()->where('encounter_id', $encounterId)->first();
        $reconciliation = $encounter?->clinical_payload['reconciliation'] ?? null;
        if (! is_array($reconciliation) || ! empty($reconciliation['noHomeMedications'])) {
            return;
        }

        $items = [];
        foreach ($reconciliation['medications'] ?? [] as $medication) {
            if (! is_array($medication)) {
                continue;
            }
            $name = trim((string) ($medication['name'] ?? ''));
            if ($name === '') {
                continue;
            }
            $route = trim((string) ($medication['route'] ?? ''));
            $items[] = [
                'drugName' => $name,
                'dose' => trim((string) ($medication['dose'] ?? '')),
                'route' => $route !== '' ? $route : 'oral',
                'frequency' => trim((string) ($medication['frequency'] ?? '')),
            ];
        }

        if ($items === []) {
            return;
        }

        $this->cpoe->prescribe($encounterId, $actor, $items);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function implausible(array $data): ?string
    {
        $limits = [
            'respiratoryRate' => [4, 60, 'La frecuencia respiratoria no es posible.'],
            'oxygenSaturation' => [50, 100, 'La saturación no es posible.'],
            'systolicBloodPressure' => [40, 280, 'La presión sistólica no es posible.'],
            'diastolicBloodPressure' => [30, 160, 'La presión diastólica no es posible.'],
            'pulse' => [20, 250, 'El pulso no es posible.'],
            'temperature' => [30, 43, 'La temperatura no es posible.'],
        ];

        foreach ($limits as $key => [$min, $max, $message]) {
            $value = (float) $data[$key];
            if ($value < $min || $value > $max) {
                return $message;
            }
        }

        return null;
    }

    private function missing(string $message): JsonResponse
    {
        return response()->json(['message' => $message], 404);
    }

    private function guard(callable $action): JsonResponse
    {
        try {
            return $action();
        } catch (AdmissionBoardException $exception) {
            return response()->json(['message' => $exception->getMessage()], $exception->status);
        }
    }
}
