<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\BedManagement\BedInfrastructure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** RF-110–112: configuración de pabellones, habitaciones y camas (administrador de accesos). */
class BedInfrastructureController extends Controller
{
    private const GENDER = ['mixed', 'male', 'female'];

    public function __construct(private readonly BedInfrastructure $infrastructure) {}

    public function wards(): JsonResponse
    {
        return response()->json($this->infrastructure->wards());
    }

    public function storeWard(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'max:20', Rule::unique('wards', 'code')->whereNull('deleted_at')],
            'name' => ['required', 'string', 'max:120'],
            'specialty' => ['required', 'string', 'max:60'],
        ]);

        return response()->json(['ward' => $this->infrastructure->createWard($data, $request->user())], 201);
    }

    public function updateWard(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:120'],
            'specialty' => ['sometimes', 'string', 'max:60'],
            'active' => ['sometimes', 'boolean'],
        ]);

        return response()->json(['ward' => $this->infrastructure->updateWard($id, $data, $request->user())]);
    }

    public function destroyWard(Request $request, int $id): JsonResponse
    {
        $this->infrastructure->deleteWard($id, $request->user());

        return response()->json(['deleted' => true]);
    }

    public function storeBed(Request $request): JsonResponse
    {
        $data = $request->validate([
            'wardId' => ['required', 'integer', Rule::exists('wards', 'id')->whereNull('deleted_at')],
            'room' => ['required', 'string', 'max:20'],
            'bedCode' => ['required', 'string', 'max:10'],
            'genderPolicy' => ['required', Rule::in(self::GENDER)],
            'isolation' => ['sometimes', 'boolean'],
        ]);

        return response()->json(['bed' => $this->infrastructure->createBed($data, $request->user())], 201);
    }

    public function updateBed(Request $request, int $id): JsonResponse
    {
        $data = $request->validate([
            'genderPolicy' => ['sometimes', Rule::in(self::GENDER)],
            'isolation' => ['sometimes', 'boolean'],
            'active' => ['sometimes', 'boolean'],
        ]);
        if (isset($data['genderPolicy'])) {
            $data['gender_policy'] = $data['genderPolicy'];
            unset($data['genderPolicy']);
        }

        return response()->json(['bed' => $this->infrastructure->updateBed($id, $data, $request->user())]);
    }

    public function destroyBed(Request $request, int $id): JsonResponse
    {
        $this->infrastructure->deleteBed($id, $request->user());

        return response()->json(['deleted' => true]);
    }

    public function previewBulk(Request $request): JsonResponse
    {
        return response()->json($this->infrastructure->previewBulk($this->bulkData($request)));
    }

    public function storeBulk(Request $request): JsonResponse
    {
        return response()->json($this->infrastructure->createBulk($this->bulkData($request), $request->user()), 201);
    }

    /** @return array<string, mixed> */
    private function bulkData(Request $request): array
    {
        return $request->validate([
            'wardId' => ['required', 'integer', Rule::exists('wards', 'id')->whereNull('deleted_at')],
            'roomFrom' => ['required', 'integer', 'min:1', 'max:99999'],
            'roomTo' => ['required', 'integer', 'gte:roomFrom', 'max:99999'],
            'bedsPerRoom' => ['required', 'integer', 'min:1', 'max:6'],
            'genderPolicy' => ['required', Rule::in(self::GENDER)],
            'isolation' => ['sometimes', 'boolean'],
        ]);
    }
}
