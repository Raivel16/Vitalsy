<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\GuardsAdmissionBoard;
use App\Http\Controllers\Controller;
use App\Models\AdmissionEncounter;
use App\Models\LifeBaselineImport;
use App\Models\User;
use App\Services\Admission\AdmissionBoard;
use App\Services\Admission\AdmissionBoardException;
use App\Services\InpatientCare\CpoeService;
use App\Services\Life\LifeLinking;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class HospitalAdmissionController extends Controller
{
    use GuardsAdmissionBoard;

    private const ORDER_NOT_FOUND = 'No se encontró la orden.';

    public function __construct(
        private readonly AdmissionBoard $board,
        private readonly CpoeService $cpoe,
    ) {}

    public function showAdmissionOrder(string $orderNumber): JsonResponse
    {
        $order = $this->board->findOrder($orderNumber);
        if (! $order) {
            return response()->json(['message' => self::ORDER_NOT_FOUND], 404);
        }

        return response()->json(['order' => $order]);
    }

    public function validateFiliation(Request $request): JsonResponse
    {
        $data = $request->validate([
            'fullName' => ['required', 'string'],
            'documentNumber' => ['required', 'string', 'regex:/^[0-9]+$/'],
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
            return response()->json(['message' => self::ORDER_NOT_FOUND], 404);
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
            'lifeUser' => ['nullable', 'boolean'],
        ]);

        return $this->guard(fn () => response()->json([
            'consent' => $this->board->storeConsent($data['encounterId'], [
                'signerName' => $data['signerName'],
                'relationship' => $data['relationship'] ?? null,
                'lifeUser' => (bool) ($data['lifeUser'] ?? false),
            ]),
        ], 201));
    }

    public function linkLife(Request $request, LifeLinking $linking): JsonResponse
    {
        $data = $request->validate([
            'encounterId' => ['required', 'string'],
            'code' => ['required', 'string', 'max:32'],
        ]);

        return response()->json([
            'link' => $linking->link($data['encounterId'], $data['code'], $request->user()),
        ], 201);
    }

    public function showLifeBaseline(string $encounterId): JsonResponse
    {
        return response()->json(['baseline' => LifeBaselineImport::presentFor($encounterId)]);
    }

    public function showTransferOrder(string $orderNumber): JsonResponse
    {
        return $this->guard(fn () => response()->json([
            'transfer' => $this->board->findTransfer($orderNumber),
        ]));
    }

    public function verifyWristband(Request $request): JsonResponse
    {
        $data = $request->validate(['code' => ['required', 'string'], 'encounterId' => ['nullable', 'string']]);

        return $this->guard(function () use ($data) {
            try {
                return response()->json(['identity' => $this->board->verifyWristband($data['code'], $data['encounterId'] ?? null)]);
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
        $reconciliation = $encounter?->readablePayload()['reconciliation'] ?? null;
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
}
