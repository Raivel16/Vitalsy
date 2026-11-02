<?php

namespace App\Console\Commands;

use App\Services\InpatientCare\MedicationDoseScheduler;
use Illuminate\Console\Command;

/**
 * RF-32: mantiene 24 horas de dosis por delante en los planes activos, aunque nadie abra el e-MAR.
 */
class ExtendEmarDoses extends Command
{
    protected $signature = 'emar:extend-doses';

    protected $description = 'Crea las próximas dosis de los planes CPOE activos';

    public function handle(MedicationDoseScheduler $scheduler): int
    {
        $this->info('Planes revisados: '.$scheduler->extendActivePlans());

        return self::SUCCESS;
    }
}
