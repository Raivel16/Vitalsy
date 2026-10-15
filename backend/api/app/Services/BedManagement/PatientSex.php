<?php

namespace App\Services\BedManagement;

use App\Models\AdmissionEncounter;
use App\Models\Patient;

/** Sexo del paciente normalizado a `female`/`male` para la política de género de las camas. */
class PatientSex
{
    public function genderOf(AdmissionEncounter $encounter): ?string
    {
        $sex = Patient::query()
            ->where('document_type', $encounter->document_type)
            ->where('document_number', $encounter->document_number)
            ->value('sex');

        return $this->normalize($sex);
    }

    /** `Femenino`/`F`/`female` → `female`; `Masculino`/`M`/`male` → `male`; otro → null. */
    public function normalize(?string $sex): ?string
    {
        $initial = strtolower(substr(trim((string) $sex), 0, 1));

        return match ($initial) {
            'f' => 'female',
            'm' => 'male',
            default => null,
        };
    }
}
