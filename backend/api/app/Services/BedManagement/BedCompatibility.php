<?php

namespace App\Services\BedManagement;

use App\Models\Bed;

/**
 * RF-72 — única fuente de verdad de la compatibilidad lecho ↔ perfil del paciente.
 * La usan tanto las sugerencias como la validación al asignar.
 *
 * @phpstan-type Profile array{isolation?: bool|null, gender?: string|null, specialty?: string|null}
 */
class BedCompatibility
{
    /**
     * Motivos por los que el lecho NO es compatible con el perfil (vacío = compatible).
     *
     * @param  array<string, mixed>  $profile
     * @return list<string>
     */
    public function violations(Bed $bed, array $profile): array
    {
        $violations = [];
        $needsIsolation = (bool) ($profile['isolation'] ?? false);

        if ($needsIsolation && ! $bed->isolation) {
            $violations[] = 'La solicitud requiere aislamiento y el lecho no es de aislamiento.';
        }
        if (! $needsIsolation && $bed->isolation) {
            $violations[] = 'El lecho de aislamiento está reservado para pacientes que lo requieren.';
        }

        $specialty = $profile['specialty'] ?? null;
        if ($specialty && $bed->ward?->specialty !== $specialty) {
            $violations[] = 'El lecho pertenece a otra especialidad.';
        }

        $gender = $profile['gender'] ?? null;
        if ($gender && ! in_array($bed->gender_policy, ['mixed', $gender], true)) {
            $violations[] = 'La política de género del lecho no coincide con el paciente.';
        }

        return $violations;
    }

    /** @param array<string, mixed> $profile */
    public function isCompatible(Bed $bed, array $profile): bool
    {
        return $this->violations($bed, $profile) === [];
    }

    /**
     * Lechos disponibles compatibles con el perfil.
     *
     * @param  array<string, mixed>  $profile
     * @return list<Bed>
     */
    public function suggest(array $profile): array
    {
        return Bed::query()
            ->with('ward')
            ->where('status', 'available')
            ->orderBy('room')
            ->orderBy('bed_code')
            ->get()
            ->filter(fn (Bed $bed) => $this->isCompatible($bed, $profile))
            ->values()
            ->all();
    }
}
