<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\GuardsAdmissionBoard;
use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Admission\AdmissionBoard;
use App\Services\Clinical\BradenScale;
use App\Services\Clinical\MorseFallScale;
use App\Services\Clinical\News2Calculator;
use App\Services\InpatientCare\VitalSignsMonitoring;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;

/** Registros clínicos de enfermería durante el ingreso (valoración, constantes, conciliación, escalas, Kardex). */
class AdmissionNursingController extends Controller
{
    use GuardsAdmissionBoard;

    private const ENCOUNTER_ID = 'encounterId';

    private const REGISTERED = 'registrada';

    public function __construct(
        private readonly AdmissionBoard $board,
        private readonly News2Calculator $news2,
        private readonly MorseFallScale $morse,
        private readonly BradenScale $braden,
        private readonly VitalSignsMonitoring $monitoring,
    ) {}

    public function storeAssessment(Request $request): JsonResponse
    {
        $data = $request->validate([
            self::ENCOUNTER_ID => ['nullable', 'string'],
            'chiefComplaint' => ['required', 'string'],
            'allergies' => ['nullable', 'array'],
            'history' => ['nullable', 'string'],
        ]);

        if (! empty($data[self::ENCOUNTER_ID])) {
            return $this->guard(function () use ($data) {
                $this->board->putClinical($data[self::ENCOUNTER_ID], 'assessment', [
                    'chiefComplaint' => $data['chiefComplaint'],
                    'allergies' => $data['allergies'] ?? [],
                    'history' => $data['history'] ?? null,
                    'status' => self::REGISTERED,
                ]);

                return response()->json(['assessment' => ['status' => self::REGISTERED]], 201);
            });
        }

        return response()->json(['assessment' => ['status' => self::REGISTERED]], 201);
    }

    public function storeVitalSigns(Request $request): JsonResponse
    {
        $data = $request->validate([
            self::ENCOUNTER_ID => ['nullable', 'string'],
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
        if (! empty($data[self::ENCOUNTER_ID])) {
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
            $this->putVitals($data, $news2, $summary);

            $actor = $request->user();
            $stored = $this->monitoring->storeManual(
                $data[self::ENCOUNTER_ID],
                $data,
                $actor instanceof User ? $actor : null,
            );
            $news2 = $stored['reading']['news2'];
            $alertActivated = (bool) $stored['alertActivated'];
            $nextControlAt = $stored['nextControlAt'];
            $this->putVitals($data, $news2, $summary);
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
            self::ENCOUNTER_ID => ['nullable', 'string'],
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
        $statusLabel = 'Con observaciones';
        if ($status === 'validada') {
            $statusLabel = $noneDeclared && $data['medications'] === [] ? 'Validada: sin medicación habitual' : 'Validada';
        }
        $reconciliation = [
            'status' => $status,
            'statusLabel' => $statusLabel,
            'alerts' => $alerts,
            'allergies' => $data['allergies'] ?? null,
            'medications' => $data['medications'],
            'noHomeMedications' => $noneDeclared,
            'notes' => $data['notes'] ?? null,
        ];

        if (! empty($data[self::ENCOUNTER_ID])) {
            $this->board->putClinical($data[self::ENCOUNTER_ID], 'reconciliation', $reconciliation);
        }

        return response()->json(['reconciliation' => $reconciliation], 201);
    }

    public function storeRiskScales(Request $request): JsonResponse
    {
        $data = $request->validate([
            self::ENCOUNTER_ID => ['nullable', 'string'],
            'morse' => ['required', 'array'],
            'braden' => ['required', 'array'],
        ]);

        try {
            $pressure = $this->braden->calculate($data['braden']);
        } catch (InvalidArgumentException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        }

        $morse = $this->morse->calculate($data['morse']);
        if (! empty($data[self::ENCOUNTER_ID])) {
            $this->board->putClinical($data[self::ENCOUNTER_ID], 'risks', [
                'morse' => $morse,
                'braden' => $pressure,
                'fallRisk' => ($morse['levelLabel'] ?? 'Riesgo').', '.($morse['total'] ?? 0).' puntos',
                'pressureRisk' => ($pressure['levelLabel'] ?? 'Riesgo').', '.($pressure['total'] ?? 0).' puntos',
            ]);
        }

        return response()->json([
            'status' => self::REGISTERED,
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

    /**
     * @param  array<string, mixed>  $data
     * @param  array<string, mixed>  $news2
     */
    private function putVitals(array $data, array $news2, string $summary): void
    {
        $this->board->putClinical($data[self::ENCOUNTER_ID], 'vitals', [
            'input' => $data,
            'news2' => $news2,
            'summary' => $summary,
            'news2Label' => ($news2['total'] ?? 0).' puntos, '.strtolower((string) ($news2['visualLabel'] ?? 'riesgo')),
        ]);
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
}
