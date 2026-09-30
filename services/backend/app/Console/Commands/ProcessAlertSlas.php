<?php

namespace App\Console\Commands;

use App\Services\ClinicalAlerts\AlertWorkflow;
use Illuminate\Console\Command;

/**
 * RF-45 y RF-48: control del tiempo de respuesta y escalamiento automático de
 * las alertas que no fueron confirmadas ni atendidas.
 */
class ProcessAlertSlas extends Command
{
    protected $signature = 'alerts:process-slas';

    protected $description = 'Escala las alertas clínicas sin confirmación ni atención dentro del tiempo establecido';

    public function handle(AlertWorkflow $alerts): int
    {
        $result = $alerts->processOverdueAlerts();

        $this->info(
            "Escalamientos de enfermería: {$result['nurse']}. "
            ."Seguimientos vencidos: {$result['followUp']}. "
            ."Escalamientos médicos: {$result['medical']}. "
            ."Controles vencidos: {$result['controls']}. "
            ."Dosis e-MAR vencidas: {$result['doses']}."
        );

        return self::SUCCESS;
    }
}
