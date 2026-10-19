<?php

namespace App\Console\Commands;

use App\Services\Interoperability\InteropMetrics;
use Illuminate\Console\Command;

class InteropSuccessRate extends Command
{
    protected $signature = 'interop:success-rate {--days=7}';

    protected $description = 'RNF-17: tasa de exito de mensajes LIS/PACS (falla si es menor al 99%)';

    public function handle(InteropMetrics $metrics): int
    {
        $days = max(1, (int) $this->option('days'));
        $threshold = (float) config('interop.success_rate_threshold', 99.0);
        $summary = $metrics->summary($days);

        if ($summary === []) {
            $this->info("Sin mensajes en los ultimos {$days} dias.");

            return self::SUCCESS;
        }

        $failed = false;
        foreach ($summary as $system => $s) {
            $this->line(sprintf('%s: total=%d ok=%d error=%d tasa=%.2f%%', strtoupper($system), $s['total'], $s['ok'], $s['error'], $s['rate']));
            if ($s['rate'] < $threshold) {
                $failed = true;
            }
        }
        if ($failed) {
            $this->error("Tasa de exito inferior a {$threshold}%.");

            return self::FAILURE;
        }

        return self::SUCCESS;
    }
}
