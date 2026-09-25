<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\InpatientCare\CpoeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class CpoeController extends Controller
{
    public function __construct(private readonly CpoeService $cpoe)
    {
    }

    public function store(Request $request, string $encounterId): JsonResponse
    {
        $data = $request->validate([
            'continuePlan' => ['sometimes', 'boolean'],
            'items' => ['required', 'array'],
            'items.*.drugName' => ['required', 'string'],
            'items.*.dose' => ['required', 'string'],
            'items.*.route' => ['required', 'string'],
            'items.*.frequency' => ['required', 'string'],
        ], [
            'items.required' => 'Debe indicar al menos un medicamento en la prescripción.',
            'items.*.drugName.required' => 'El nombre del medicamento es obligatorio.',
            'items.*.dose.required' => 'La dosis es obligatoria.',
            'items.*.route.required' => 'La vía es obligatoria.',
            'items.*.frequency.required' => 'La frecuencia es obligatoria.',
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
        $item = $this->validateItem($request);
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

    public function active(string $encounterId): JsonResponse
    {
        return response()->json($this->cpoe->active($encounterId));
    }

    public function kardex(string $encounterId): JsonResponse
    {
        return response()->json($this->cpoe->kardex($encounterId));
    }

    /**
     * @return array{drugName: string, dose: string, route: string, frequency: string}
     */
    private function validateItem(Request $request): array
    {
        return $request->validate([
            'drugName' => ['required', 'string'],
            'dose' => ['required', 'string'],
            'route' => ['required', 'string'],
            'frequency' => ['required', 'string'],
        ], [
            'drugName.required' => 'El nombre del medicamento es obligatorio.',
            'dose.required' => 'La dosis es obligatoria.',
            'route.required' => 'La vía es obligatoria.',
            'frequency.required' => 'La frecuencia es obligatoria.',
        ]);
    }
}
