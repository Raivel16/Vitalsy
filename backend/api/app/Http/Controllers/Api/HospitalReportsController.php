<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ClinicalAlerts\AlertReportService;
use App\Services\Reports\HospitalIndicatorsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/** RF-115: tablero de indicadores hospitalarios para jefatura, supervisión y gestión de camas. */
class HospitalReportsController extends Controller
{
    private const DATE_FORMAT = 'date_format:Y-m-d';

    public function __construct(private readonly HospitalIndicatorsService $indicators) {}

    public function show(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from' => ['nullable', self::DATE_FORMAT],
            'to' => ['nullable', self::DATE_FORMAT, 'after_or_equal:from'],
            'ward' => ['nullable', 'string', 'exists:wards,code'],
        ], [
            'from.date_format' => 'La fecha inicial no es válida.',
            'to.date_format' => 'La fecha final no es válida.',
            'to.after_or_equal' => 'La fecha final no puede ser anterior a la inicial.',
            'ward.exists' => 'La sala seleccionada no existe.',
        ]);

        [$from, $to] = $this->indicators->period($data);
        if ($from->diffInDays($to) >= AlertReportService::MAX_DAYS) {
            throw ValidationException::withMessages([
                'from' => 'El período no puede superar '.AlertReportService::MAX_DAYS.' días.',
            ]);
        }

        return response()->json($this->indicators->build($data));
    }
}
