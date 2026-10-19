<?php

namespace App\Services\Interoperability;

use Illuminate\Support\Facades\DB;

/** RNF-17: contador de mensajes procesados ok/error. Sin PHI: solo ids y resultado. */
class InteropMetrics
{
    public function record(string $system, string $resourceType, bool $ok, ?string $externalId = null, ?string $errorCode = null, int $durationMs = 0): void
    {
        DB::table('interop_message_logs')->insert([
            'system' => $system,
            'direction' => 'in',
            'resource_type' => $resourceType,
            'external_id' => $externalId !== null ? mb_substr($externalId, 0, 120) : null,
            'outcome' => $ok ? 'ok' : 'error',
            'error_code' => $errorCode !== null ? mb_substr($errorCode, 0, 60) : null,
            'duration_ms' => max(0, $durationMs),
            'created_at' => now(),
        ]);
    }

    /**
     * @return array<string, array{total: int, ok: int, error: int, rate: float|null}>
     */
    public function summary(int $days = 7): array
    {
        $rows = DB::table('interop_message_logs')
            ->where('created_at', '>=', now()->subDays($days))
            ->selectRaw('system, outcome, count(*) as n')
            ->groupBy('system', 'outcome')
            ->get();

        $out = [];
        foreach ($rows as $row) {
            $out[$row->system] ??= ['total' => 0, 'ok' => 0, 'error' => 0, 'rate' => null];
            $out[$row->system][$row->outcome === 'ok' ? 'ok' : 'error'] += (int) $row->n;
            $out[$row->system]['total'] += (int) $row->n;
        }
        foreach ($out as &$s) {
            $s['rate'] = $s['total'] > 0 ? round($s['ok'] / $s['total'] * 100, 2) : null;
        }

        return $out;
    }
}
