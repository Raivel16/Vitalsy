<?php

namespace App\Listeners;

use App\Events\PatientExited;
use App\Services\InpatientCare\MedicationDoseScheduler;

class CancelDosesOnPatientExit
{
    public function __construct(private readonly MedicationDoseScheduler $scheduler) {}

    public function handle(PatientExited $event): void
    {
        $this->scheduler->cancelPendingForEncounter($event->encounterId, 'Dosis cancelada: el paciente salió del hospital.');
    }
}
