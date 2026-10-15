<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Services\ClinicalAlerts\AlertRecorder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * RNF-01: mide el tiempo de SERVIDOR entre la decisión de abrir una alerta
 * (NEWS2 >= 7) y la entrega del último evento al broadcaster configurado.
 * No mide la recepción en el navegador (extremo a extremo): eso requiere una
 * corrida en staging con un cliente real conectado a Reverb.
 */
class MeasureAlertLatency extends Command
{
    protected $signature = 'alerts:measure-latency {--count=50 : Alertas sintéticas a generar} {--budget=2000 : Presupuesto en ms}';

    protected $description = 'Mide p50/p95 del despacho servidor de alertas críticas hacia el broadcaster (RNF-01, solo lado servidor)';

    public function handle(AlertRecorder $recorder): int
    {
        $count = max(1, (int) $this->option('count'));
        $budget = (float) $this->option('budget');
        $driver = (string) config('broadcasting.default');
        $samples = [];

        DB::beginTransaction();
        try {
            if (! User::query()->where('is_active', true)->where('role', 'enfermera_piso')->exists()) {
                User::factory()->create(['role' => 'enfermera_piso']);
            }

            for ($i = 0; $i < $count; $i++) {
                $start = hrtime(true);
                $recorder->openFromMonitoring('MEASURE-'.$i, 8);
                $samples[] = (hrtime(true) - $start) / 1e6;
            }
        } finally {
            DB::rollBack();
        }

        sort($samples);
        $p = fn (float $q): float => $samples[(int) min(count($samples) - 1, max(0, ceil($q * count($samples)) - 1))];
        $p50 = $p(0.50);
        $p95 = $p(0.95);

        $this->info("Broadcaster: {$driver} · muestras: {$count}");
        $this->line(sprintf('Despacho servidor (decisión -> broadcast): p50 %.1f ms · p95 %.1f ms · máx %.1f ms', $p50, $p95, max($samples)));
        $this->warn('Alcance: solo servidor. La recepción en el cliente (RNF-01 extremo a extremo) requiere una corrida en staging.');

        if ($p95 > $budget) {
            $this->error("p95 supera el presupuesto de {$budget} ms.");

            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
