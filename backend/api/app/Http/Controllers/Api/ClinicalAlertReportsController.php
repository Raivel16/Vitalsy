<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ClinicalAlerts\AlertReportService;
use Closure;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** RF-114: reportes de monitoreo y respuesta a alertas para la supervisión de enfermería. */
class ClinicalAlertReportsController extends Controller
{
    private const DATE_FORMAT = 'date_format:Y-m-d';

    public function __construct(private readonly AlertReportService $reports) {}

    public function show(Request $request): JsonResponse
    {
        $data = $request->validate([
            'from' => ['nullable', self::DATE_FORMAT, $this->maxRange($request)],
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

        return response()->json($this->reports->build($data));
    }

    private function maxRange(Request $request): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail) use ($request): void {
            [$from, $to] = $this->reports->period((string) $value, $request->query('to'));
            if ($from->diffInDays($to) >= AlertReportService::MAX_DAYS) {
                $fail('El período no puede superar '.AlertReportService::MAX_DAYS.' días.');
            }
        };
    }
}
