<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\InpatientCare\LabResultsIntegrator;
use Illuminate\Http\JsonResponse;

class LabResultsController extends Controller
{
    public function __construct(private readonly LabResultsIntegrator $integrator) {}

    public function sync(string $encounterId): JsonResponse
    {
        $results = $this->integrator->sync($encounterId);

        return response()->json([
            'integrated' => count($results),
            'results' => $results,
        ]);
    }

    public function index(string $encounterId): JsonResponse
    {
        return response()->json([
            'results' => $this->integrator->list($encounterId),
        ]);
    }
}
