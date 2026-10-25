<?php

namespace App\Console\Commands;

use App\Models\AdmissionEncounter;
use App\Models\Prescription;
use App\Services\InpatientCare\CpoeService;
use Illuminate\Console\Command;

/**
 * RF-33: la pantalla del e-MAR no muestra los códigos esperados, pero quien prueba necesita saber
 * qué escanear. El código del paciente es el del brazalete; el del medicamento se calcula como
 * `DRUG-{NOMBRE}-{DOSIS}` (mayúsculas, sin espacios).
 */
class ListEmarCodes extends Command
{
    protected $signature = 'emar:codes {encounter : Identificador del ingreso, p. ej. ENC-0001}';

    protected $description = 'Muestra el código del brazalete y los códigos de medicamento esperados en el e-MAR de un ingreso';

    public function handle(): int
    {
        $encounterId = (string) $this->argument('encounter');
        $encounter = AdmissionEncounter::query()->where('encounter_id', $encounterId)->first();
        if (! $encounter) {
            $this->error("No se encontró el ingreso {$encounterId}.");

            return self::FAILURE;
        }

        $this->line('Brazalete del paciente: '.($encounter->wristband_code ?: '(aún sin emitir)'));

        $prescription = Prescription::query()
            ->where('encounter_id', $encounterId)
            ->where('status', 'activo')
            ->latest('id')
            ->first();
        $items = $prescription?->items ?? collect();
        if ($items->isEmpty()) {
            $this->line('Sin prescripción activa: no hay códigos de medicamento.');

            return self::SUCCESS;
        }

        foreach ($items as $item) {
            $this->line("Medicamento {$item->drug_name} {$item->dose}: ".CpoeService::drugBarcodeFor($item->drug_name, $item->dose));
        }

        return self::SUCCESS;
    }
}
