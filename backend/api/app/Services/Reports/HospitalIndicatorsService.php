<?php

namespace App\Services\Reports;

use App\Models\AdmissionEncounter;
use App\Models\Bed;
use App\Models\BedAssignment;
use App\Models\CleaningOrder;
use App\Models\PatientExit;
use App\Models\Ward;
use App\Services\ClinicalAlerts\AlertReportService;
use Carbon\CarbonImmutable;
use Carbon\CarbonPeriod;
use Illuminate\Support\Collection;

/**
 * RF-115: indicadores hospitalarios calculados con los registros de camas, ingresos,
 * salidas efectivas, órdenes de limpieza y alertas clínicas (RF-114).
 */
class HospitalIndicatorsService
{
    private const SECONDS_PER_HOUR = 3600;

    private const SECONDS_PER_MINUTE = 60;

    private const BED_STATUSES = ['occupied', 'available', 'cleaning', 'blocked'];

    public function __construct(private readonly AlertReportService $alerts) {}

    /**
     * @param  array{from?: ?string, to?: ?string, ward?: ?string}  $filters
     * @return array<string, mixed>
     */
    public function build(array $filters): array
    {
        [$from, $to] = $this->period($filters);
        $ward = $this->ward($filters['ward'] ?? null);

        return [
            'period' => ['from' => $from->toDateString(), 'to' => $to->toDateString()],
            'filters' => ['ward' => $ward?->code],
            'options' => ['wards' => $this->wardOptions()],
            'beds' => $this->beds($ward),
            'flow' => $this->flow($from, $to, $ward),
            'turnover' => $this->turnover($from, $to, $ward),
            'alerts' => $this->alertSla($from, $to),
        ];
    }

    /**
     * @param  array{from?: ?string, to?: ?string}  $filters
     * @return array{0: CarbonImmutable, 1: CarbonImmutable}
     */
    public function period(array $filters): array
    {
        return $this->alerts->period($filters['from'] ?? null, $filters['to'] ?? null);
    }

    private function ward(?string $code): ?Ward
    {
        return $code === null || $code === '' ? null : Ward::query()->where('code', $code)->first();
    }

    /** @return list<array{code: string, name: string}> */
    private function wardOptions(): array
    {
        return Ward::query()->orderBy('name')->get(['code', 'name'])
            ->map(fn (Ward $ward) => ['code' => $ward->code, 'name' => $ward->name])
            ->all();
    }

    /** @return array<string, mixed> */
    private function beds(?Ward $ward): array
    {
        $beds = Bed::query()
            ->with('ward:id,code,name')
            ->where('active', true)
            ->when($ward, fn ($query) => $query->where('ward_id', $ward->id))
            ->get();

        $summary = ['total' => $beds->count()];
        foreach (self::BED_STATUSES as $status) {
            $summary[$status] = $beds->where('status', $status)->count();
        }

        return $summary + [
            'occupancyPercent' => $this->percent($summary['occupied'], $summary['total']),
            'byWard' => $this->bedsByWard($beds),
        ];
    }

    /**
     * @param  Collection<int, Bed>  $beds
     * @return list<array<string, mixed>>
     */
    private function bedsByWard(Collection $beds): array
    {
        return $beds->groupBy('ward_id')
            ->map(function (Collection $group) {
                $occupied = $group->where('status', 'occupied')->count();

                return [
                    'code' => $group->first()->ward->code,
                    'name' => $group->first()->ward->name,
                    'total' => $group->count(),
                    'occupied' => $occupied,
                    'occupancyPercent' => $this->percent($occupied, $group->count()),
                ];
            })
            ->sortBy('name')
            ->values()
            ->all();
    }

    /** @return array<string, mixed> */
    private function flow(CarbonImmutable $from, CarbonImmutable $to, ?Ward $ward): array
    {
        $encounterIds = $this->encounterIdsOf($ward);

        $admissions = AdmissionEncounter::query()
            ->whereBetween('created_at', [$from, $to])
            ->when($encounterIds, fn ($query) => $query->whereIn('encounter_id', $encounterIds))
            ->get(['encounter_id', 'created_at']);

        $exits = PatientExit::query()
            ->whereBetween('exited_at', [$from, $to])
            ->when($encounterIds, fn ($query) => $query->whereIn('encounter_id', $encounterIds))
            ->get(['encounter_id', 'exited_at']);

        return [
            'admissions' => $admissions->count(),
            'discharges' => $exits->count(),
            'averageStayHours' => $this->averageStayHours($exits),
            'daily' => $this->daily($admissions, $exits, $from, $to),
        ];
    }

    /** @return list<string>|null `null` cuando no hay filtro de sala. */
    private function encounterIdsOf(?Ward $ward): ?array
    {
        if ($ward === null) {
            return null;
        }

        return BedAssignment::query()
            ->whereIn('bed_id', Bed::query()->where('ward_id', $ward->id)->select('id'))
            ->distinct()
            ->pluck('encounter_id')
            ->all();
    }

    /** @param Collection<int, PatientExit> $exits */
    private function averageStayHours(Collection $exits): ?float
    {
        $admittedAt = AdmissionEncounter::query()
            ->whereIn('encounter_id', $exits->pluck('encounter_id'))
            ->pluck('created_at', 'encounter_id');

        $hours = $exits
            ->filter(fn (PatientExit $exit) => isset($admittedAt[$exit->encounter_id]))
            ->map(fn (PatientExit $exit) => ($exit->exited_at->getTimestamp() - $admittedAt[$exit->encounter_id]->getTimestamp()) / self::SECONDS_PER_HOUR);

        return $hours->isEmpty() ? null : round($hours->avg(), 1);
    }

    /**
     * @param  Collection<int, AdmissionEncounter>  $admissions
     * @param  Collection<int, PatientExit>  $exits
     * @return list<array{date: string, admissions: int, discharges: int}>
     */
    private function daily(Collection $admissions, Collection $exits, CarbonImmutable $from, CarbonImmutable $to): array
    {
        $admittedByDay = $admissions->countBy(fn (AdmissionEncounter $encounter) => $encounter->created_at->toDateString());
        $exitedByDay = $exits->countBy(fn (PatientExit $exit) => $exit->exited_at->toDateString());

        $rows = [];
        foreach (CarbonPeriod::create($from, $to) as $day) {
            $date = $day->toDateString();
            $rows[] = [
                'date' => $date,
                'admissions' => $admittedByDay[$date] ?? 0,
                'discharges' => $exitedByDay[$date] ?? 0,
            ];
        }

        return $rows;
    }

    /**
     * Recambio: desde que se despacha la limpieza hasta que la cama se habilita
     * (o, si aún no se registró la habilitación, hasta que termina la limpieza).
     *
     * @return array{completed: int, pending: int, averageMinutes: ?float}
     */
    private function turnover(CarbonImmutable $from, CarbonImmutable $to, ?Ward $ward): array
    {
        $orders = CleaningOrder::query()
            ->whereBetween('dispatched_at', [$from, $to])
            ->when($ward, fn ($query) => $query->whereIn('bed_id', Bed::query()->where('ward_id', $ward->id)->select('id')))
            ->get();

        $minutes = $orders
            ->filter(fn (CleaningOrder $order) => ($order->enabled_at ?? $order->completed_at) !== null)
            ->map(fn (CleaningOrder $order) => (($order->enabled_at ?? $order->completed_at)->getTimestamp() - $order->dispatched_at->getTimestamp()) / self::SECONDS_PER_MINUTE);

        return [
            'completed' => $minutes->count(),
            'pending' => $orders->count() - $minutes->count(),
            'averageMinutes' => $minutes->isEmpty() ? null : round($minutes->avg(), 1),
        ];
    }

    /**
     * Las alertas no se filtran por sala: `clinical_alerts` no guarda la cama del paciente.
     *
     * @return array<string, mixed>
     */
    private function alertSla(CarbonImmutable $from, CarbonImmutable $to): array
    {
        $report = $this->alerts->build(['from' => $from->toDateString(), 'to' => $to->toDateString()]);

        return [
            'totalAlerts' => $report['summary']['totalAlerts'],
            'activeAlerts' => $report['summary']['activeAlerts'],
            'nurseAcknowledgement' => $report['nurseAcknowledgement'],
        ];
    }

    private function percent(int $part, int $total): ?float
    {
        return $total === 0 ? null : round($part * 100 / $total, 1);
    }
}
