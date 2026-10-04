<?php

namespace App\Listeners;

use App\Events\PatientExited;
use App\Services\BedManagement\BedManagement;

class DispatchCleaningOnPatientExit
{
    public function __construct(private readonly BedManagement $beds) {}

    public function handle(PatientExited $event): void
    {
        $this->beds->vacateEncounter($event->encounterId);
    }
}
