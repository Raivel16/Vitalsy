<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\InpatientCare\PatientClinicalChart;
use App\Support\Security\DegradedRead;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class PatientClinicalChartController extends Controller
{
    public function __construct(private readonly PatientClinicalChart $chart) {}

    public function show(Request $request, string $encounterId): JsonResponse
    {
        $data = $request->validate([
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date', 'after_or_equal:from'],
        ]);

        $from = isset($data['from']) ? Carbon::parse($data['from'])->startOfDay() : null;
        $to = isset($data['to']) ? Carbon::parse($data['to'])->endOfDay() : null;

        return DegradedRead::json(fn () => $this->chart->forEncounter($encounterId, $from, $to));
    }
}
