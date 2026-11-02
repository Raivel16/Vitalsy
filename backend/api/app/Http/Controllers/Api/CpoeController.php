<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\InpatientCare\CpoeService;
use App\Services\InpatientCare\MedicationDoseScheduler;
use App\Support\MedicationFrequency;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class CpoeController extends Controller
{
    private const FREQUENCY_FROM_LIST = 'Elija una frecuencia de la lista.';

    private const FIRST_DOSE_REQUIRED = 'Indique la fecha y hora de la primera dosis.';

    private const FIRST_DOSE_NOT_PAST = 'La primera dosis no puede estar en el pasado.';

    public function __construct(private readonly CpoeService $cpoe) {}

    public function store(Request $request, string $encounterId): JsonResponse
    {
        $data = $request->validate([
            'continuePlan' => ['sometimes', 'boolean'],
            'items' => ['required', 'array'],
            'items.*.drugName' => ['required', 'string'],
            'items.*.dose' => ['required', 'string'],
            'items.*.route' => ['required', 'string'],
            'items.*.frequency' => ['required', 'string', Rule::in(MedicationFrequency::OPTIONS)],
            'items.*.firstDoseAt' => ['required', 'date', 'after_or_equal:'.$this->earliestFirstDose()],
        ], [
            'items.required' => 'Debe indicar al menos un medicamento en la prescripción.',
            'items.*.drugName.required' => 'El nombre del medicamento es obligatorio.',
            'items.*.dose.required' => 'La dosis es obligatoria.',
            'items.*.route.required' => 'La vía es obligatoria.',
            'items.*.frequency.required' => 'La frecuencia es obligatoria.',
            'items.*.frequency.in' => self::FREQUENCY_FROM_LIST,
            'items.*.firstDoseAt.required' => self::FIRST_DOSE_REQUIRED,
            'items.*.firstDoseAt.date' => self::FIRST_DOSE_REQUIRED,
            'items.*.firstDoseAt.after_or_equal' => self::FIRST_DOSE_NOT_PAST,
        ]);

        if ($data['items'] === []) {
            throw ValidationException::withMessages([
                'items' => ['Debe indicar al menos un medicamento en la prescripción.'],
            ]);
        }

        $result = $this->cpoe->prescribe(
            $encounterId,
            $request->user(),
            $data['items'],
            (bool) ($data['continuePlan'] ?? false),
        );

        return response()->json($result, 201);
    }

    public function storeItem(Request $request, string $encounterId): JsonResponse
    {
        $item = $this->validateItem($request, ['after_or_equal:'.$this->earliestFirstDose()]);
        $result = $this->cpoe->addItem($encounterId, $item);

        return response()->json($result, 201);
    }

    public function updateItem(Request $request, string $encounterId, int $itemId): JsonResponse
    {
        $item = $this->validateItem($request);
        $result = $this->cpoe->updateItem($encounterId, $itemId, $item);

        return response()->json($result);
    }

    public function destroyItem(string $encounterId, int $itemId): JsonResponse
    {
        return response()->json($this->cpoe->deleteItem($encounterId, $itemId));
    }

    public function active(Request $request, string $encounterId): JsonResponse
    {
        $active = $this->cpoe->active($encounterId);

        // HP-04: quien escanea en el e-MAR (enfermería de piso) no recibe los códigos esperados del medicamento.
        if ($request->user()?->role === 'enfermera_piso' && $active['prescription'] !== null) {
            $active['prescription']['items'] = array_map(
                fn (array $item) => array_diff_key($item, ['drugBarcode' => true]),
                $active['prescription']['items'],
            );
        }

        return response()->json($active);
    }

    public function kardex(string $encounterId): JsonResponse
    {
        return response()->json($this->cpoe->kardex($encounterId));
    }

    /**
     * Al editar, la primera dosis original puede estar en el pasado: el servicio la valida solo si cambia el horario.
     *
     * @param  list<string>  $firstDoseRules
     * @return array{drugName: string, dose: string, route: string, frequency: string, firstDoseAt: string}
     */
    private function validateItem(Request $request, array $firstDoseRules = []): array
    {
        return $request->validate([
            'drugName' => ['required', 'string'],
            'dose' => ['required', 'string'],
            'route' => ['required', 'string'],
            'frequency' => ['required', 'string', Rule::in(MedicationFrequency::OPTIONS)],
            'firstDoseAt' => ['required', 'date', ...$firstDoseRules],
        ], [
            'drugName.required' => 'El nombre del medicamento es obligatorio.',
            'dose.required' => 'La dosis es obligatoria.',
            'route.required' => 'La vía es obligatoria.',
            'frequency.required' => 'La frecuencia es obligatoria.',
            'frequency.in' => self::FREQUENCY_FROM_LIST,
            'firstDoseAt.required' => self::FIRST_DOSE_REQUIRED,
            'firstDoseAt.date' => self::FIRST_DOSE_REQUIRED,
            'firstDoseAt.after_or_equal' => self::FIRST_DOSE_NOT_PAST,
        ]);
    }

    private function earliestFirstDose(): string
    {
        return now()->subMinutes(MedicationDoseScheduler::PAST_TOLERANCE_MINUTES)->toIso8601String();
    }
}
