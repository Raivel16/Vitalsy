<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Clinical\BradenScale;
use App\Services\Clinical\MorseFallScale;
use App\Services\Clinical\News2Calculator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

class HospitalAdmissionController extends Controller
{
    public function __construct(
        private readonly News2Calculator $news2,
        private readonly MorseFallScale $morse,
        private readonly BradenScale $braden,
    ) {}

    public function showAdmissionOrder(string $orderNumber): JsonResponse
    {
        $order = $this->orders()[$orderNumber] ?? null;
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
            'confirmed' => ['accepted'],
        ]);

        return response()->json([
            'validated' => true,
            'patient' => ['fullName' => $data['fullName'], 'documentNumber' => $data['documentNumber']],
        ]);
    }

    public function validateCoverage(Request $request): JsonResponse
    {
        $data = $request->validate(['orderNumber' => ['required', 'string']]);
        $order = $this->orders()[$data['orderNumber']] ?? null;
        if (! $order) {
            return $this->missing('No se encontró la orden.');
        }

        return response()->json(['coverage' => $order['coverage']]);
    }

    public function referCoverage(Request $request): JsonResponse
    {
        $data = $request->validate([
            'destination' => ['required', 'in:caja,trabajo_social'],
            'relativeName' => ['required', 'string'],
            'relativePhone' => ['required', 'string'],
            'note' => ['nullable', 'string'],
        ]);

        return response()->json([
            'referral' => [
                'destination' => $data['destination'],
                'status' => 'derivado',
                'relativeName' => $data['relativeName'],
            ],
        ], 201);
    }

    public function issueWristband(): JsonResponse
    {
        return response()->json([
            'wristband' => ['code' => 'BRZ-0001-ANA', 'recordId' => 'EXP-0001'],
        ], 201);
    }

    public function openRecord(): JsonResponse
    {
        return response()->json([
            'record' => ['recordId' => 'EXP-0001', 'status' => 'abierto'],
        ], 201);
    }

    public function storeConsent(Request $request): JsonResponse
    {
        $data = $request->validate([
            'signerName' => ['required', 'string'],
            'accepted' => ['accepted'],
            'relationship' => ['nullable', 'string'],
        ]);

        return response()->json([
            'consent' => ['status' => 'firmado', 'signerName' => $data['signerName']],
        ], 201);
    }

    public function showTransferOrder(string $orderNumber): JsonResponse
    {
        if ($orderNumber !== 'OT-2026-0001') {
            return $this->missing('No se encontró la orden de traslado.');
        }

        return response()->json([
            'transfer' => [
                'orderNumber' => 'OT-2026-0001',
                'patientName' => 'Ana María Quispe Rojas',
                'room' => '312',
                'bed' => 'B',
                'service' => 'Medicina interna',
            ],
        ]);
    }

    public function verifyWristband(Request $request): JsonResponse
    {
        $data = $request->validate(['code' => ['required', 'string']]);
        if ($data['code'] !== 'BRZ-0001-ANA') {
            return response()->json([
                'message' => 'El código no corresponde al paciente.',
            ], 422);
        }

        return response()->json([
            'identity' => ['patientName' => 'Ana María Quispe Rojas', 'code' => $data['code']],
        ]);
    }

    public function confirmReception(Request $request): JsonResponse
    {
        $request->validate([
            'encounterId' => ['required', 'string'],
            'confirmed' => ['accepted'],
        ]);

        return response()->json([
            'reception' => ['status' => 'ingresado'],
        ], 201);
    }

    public function relocate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'encounterId' => ['required', 'string'],
            'reason' => ['required', 'string'],
            'requestedRoom' => ['required', 'string'],
            'requestedBed' => ['required', 'string'],
        ]);

        return response()->json([
            'relocation' => [
                'status' => 'notificada',
                'room' => $data['requestedRoom'],
                'bed' => $data['requestedBed'],
            ],
        ], 201);
    }

    public function storeAssessment(Request $request): JsonResponse
    {
        $request->validate([
            'chiefComplaint' => ['required', 'string'],
            'allergies' => ['nullable', 'array'],
            'history' => ['nullable', 'string'],
        ]);

        return response()->json([
            'assessment' => ['status' => 'registrada'],
        ], 201);
    }

    public function storeVitalSigns(Request $request): JsonResponse
    {
        $data = $request->validate([
            'respiratoryRate' => ['required', 'numeric'],
            'oxygenSaturation' => ['required', 'numeric'],
            'systolicBloodPressure' => ['required', 'numeric'],
            'pulse' => ['required', 'numeric'],
            'temperature' => ['required', 'numeric'],
            'spo2Scale' => ['nullable', 'in:scale1,scale2'],
            'supplementalOxygen' => ['nullable', 'boolean'],
            'consciousness' => ['nullable', 'in:alert,confusion,voice,pain,unresponsive'],
            'confusionOnset' => ['nullable', 'in:new,chronic'],
        ]);

        if ($message = $this->implausible($data)) {
            return response()->json(['message' => $message], 422);
        }

        return response()->json([
            'news2' => $this->news2->calculate($data),
        ], 201);
    }

    public function storeReconciliation(Request $request): JsonResponse
    {
        $data = $request->validate([
            'allergies' => ['nullable', 'string'],
            'medications' => ['required', 'array'],
            'medications.*.name' => ['required', 'string'],
        ]);

        $alerts = [];
        foreach ($data['medications'] as $medication) {
            if (preg_match('/penicil/i', (string) ($data['allergies'] ?? '')) && preg_match('/amoxicil|ampicil|penicil/i', $medication['name'])) {
                $alerts[] = 'Posible alergia: '.$medication['name'].' coincide con alergia a penicilina.';
            }
        }

        $status = $alerts === [] ? 'validada' : 'con_observaciones';

        return response()->json([
            'reconciliation' => [
                'status' => $status,
                'statusLabel' => $status === 'validada' ? 'Validada' : 'Con observaciones',
                'alerts' => $alerts,
            ],
        ], 201);
    }

    public function storeRiskScales(Request $request): JsonResponse
    {
        $data = $request->validate([
            'morse' => ['required', 'array'],
            'braden' => ['required', 'array'],
        ]);

        try {
            $pressure = $this->braden->calculate($data['braden']);
        } catch (InvalidArgumentException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        return response()->json([
            'status' => 'registrada',
            'morse' => $this->morse->calculate($data['morse']),
            'braden' => $pressure,
        ], 201);
    }

    public function showKardex(string $encounterId): JsonResponse
    {
        if ($encounterId !== 'ENC-0001') {
            return $this->missing('Kardex no disponible.');
        }

        return response()->json([
            'kardex' => [
                'patientName' => 'Ana María Quispe Rojas',
                'assessment' => 'Disnea de dos días',
                'allergies' => ['Penicilina'],
                'medications' => ['Amoxicilina 500 mg cada 8 horas'],
                'vitals' => 'FR 16, SpO2 98 %, PA 120, pulso 72, 36.8 °C',
                'news2' => '0 puntos, riesgo bajo',
                'fallRisk' => 'Riesgo alto de caídas, 45 puntos',
                'pressureRisk' => 'Riesgo leve de úlceras por presión, 18 puntos',
            ],
        ]);
    }

    public function showMedicalOrders(string $encounterId): JsonResponse
    {
        if ($encounterId !== 'ENC-0001') {
            return $this->missing('Indicaciones no disponibles.');
        }

        return response()->json([
            'orders' => [
                'status' => 'pendiente',
                'statusLabel' => 'Pendiente de firma',
                'items' => ['Reposo relativo', 'Oxígeno si SpO2 menor de 92 %'],
            ],
        ]);
    }

    public function signMedicalOrders(Request $request, string $encounterId): JsonResponse
    {
        if ($encounterId !== 'ENC-0001') {
            return $this->missing('Indicaciones no disponibles.');
        }

        $data = $request->validate([
            'physicianName' => ['required', 'string'],
            'credential' => ['required', 'string'],
            'confirmed' => ['accepted'],
        ]);

        return response()->json([
            'signature' => [
                'status' => 'firmado',
                'physicianName' => $data['physicianName'],
                'credential' => $data['credential'],
            ],
        ], 201);
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

    /**
     * @return array<string, array<string, mixed>>
     */
    private function orders(): array
    {
        $patient = [
            'fullName' => 'Ana María Quispe Rojas',
            'documentType' => 'DNI',
            'documentNumber' => '45678912',
            'birthDate' => '1978-04-12',
            'sex' => 'Femenino',
        ];

        return [
            'OI-2026-0001' => [
                'orderNumber' => 'OI-2026-0001',
                'originService' => 'Emergencia adultos',
                'requestingPhysician' => 'Dra. Lucía Herrera',
                'reason' => 'Neumonía adquirida en la comunidad',
                'patient' => $patient,
                'coverage' => ['payer' => 'SIS', 'status' => 'aprobada', 'plan' => 'SIS Gratuito'],
            ],
            'OI-2026-0002' => [
                'orderNumber' => 'OI-2026-0002',
                'originService' => 'Emergencia adultos',
                'requestingPhysician' => 'Dr. Mateo Salas',
                'reason' => 'Dolor abdominal',
                'patient' => [...$patient, 'fullName' => 'Luis Ernesto Paredes', 'documentNumber' => '40112233'],
                'coverage' => ['payer' => 'EsSalud', 'status' => 'pendiente', 'plan' => 'Regular'],
            ],
            'OI-2026-0003' => [
                'orderNumber' => 'OI-2026-0003',
                'originService' => 'Consulta externa',
                'requestingPhysician' => 'Dra. Lucía Herrera',
                'reason' => 'Control de insuficiencia cardíaca',
                'patient' => [...$patient, 'fullName' => 'Carmen Yolanda Vega', 'documentNumber' => '09881234'],
                'coverage' => ['payer' => 'Particular', 'status' => 'rechazada', 'plan' => 'Sin cobertura vigente'],
            ],
        ];
    }
}
