<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ClinicalAlerts\AlertReportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/** RF-114: reportes de monitoreo y respuesta a alertas para la supervisión de enfermería. */
class ClinicalAlertReportsController extends Controller
{
    private const DATE_FORMAT = 'date_format:Y-m-d';

    public function __construct(private readonly AlertReportService $reports) {}

    public function show(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from' => ['nullable', self::DATE_FORMAT],
            'to' => ['nullable', self::DATE_FORMAT, 'after_or_equal:from'],
            'severity' => ['nullable', Rule::in(AlertReportService::SEVERITIES)],
            'source' => ['nullable', Rule::in(AlertReportService::SOURCES)],
            'service' => ['nullable', 'string', 'max:120'],
        ], [
            'from.date_format' => 'La fecha inicial no es válida.',
            'to.date_format' => 'La fecha final no es válida.',
            'to.after_or_equal' => 'La fecha final no puede ser anterior a la inicial.',
            'severity.in' => 'La severidad debe ser alta, media o baja.',
            'source.in' => 'El origen de la alerta no es válido.',
        ]);

        // El rango se comprueba sobre los datos ya validados: misma fuente y fechas con formato correcto.
        [$from, $to] = $this->reports->period($data['from'] ?? null, $data['to'] ?? null);
        if ($from->diffInDays($to) >= AlertReportService::MAX_DAYS) {
            throw ValidationException::withMessages([
                'from' => 'El período no puede superar '.AlertReportService::MAX_DAYS.' días.',
            ]);
        }

        return response()->json($this->reports->build($data));
    }
}
