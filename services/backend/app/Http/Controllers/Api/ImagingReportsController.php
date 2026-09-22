<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\InpatientCare\ImagingReportsIntegrator;
use Illuminate\Http\JsonResponse;

class ImagingReportsController extends Controller
{
    public function __construct(private readonly ImagingReportsIntegrator $integrator)
    {
    }

    public function sync(string $encounterId): JsonResponse
    {
        $reports = $this->integrator->sync($encounterId);

        return response()->json([
            'integrated' => count($reports),
            'reports' => $reports,
        ]);
    }

    public function index(string $encounterId): JsonResponse
    {
        return response()->json([
            'reports' => $this->integrator->list($encounterId),
        ]);
    }
}
