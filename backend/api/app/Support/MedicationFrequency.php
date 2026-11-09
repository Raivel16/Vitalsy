<?php

namespace App\Support;

/**
 * RF-25: frecuencias que el médico elige en CPOE. La misma lista vive en
 * `frontend/web/src/modules/cpoe/domain/schedule.ts`.
 */
final class MedicationFrequency
{
    public const SINGLE_DOSE = 'dosis única';

    public const OPTIONS = [
        'cada 4 horas',
        'cada 6 horas',
        'cada 8 horas',
        'cada 12 horas',
        'cada 24 horas',
        self::SINGLE_DOSE,
    ];

    /**
     * Horas entre dosis, o null si no se repite o no se entiende. El texto libre solo llega de
     * planes anteriores y del BPMH: solo se aceptan formatos explícitos, nunca se supone un intervalo.
     */
    public static function intervalHours(string $frequency): ?int
    {
        $withoutPrefix = preg_replace('/^(?:cada|c\/)\s*/iu', '', trim($frequency)) ?? '';

        if (preg_match('/^(\d+)\s*h(?:oras?|rs?)?\.?$/iu', $withoutPrefix, $match) !== 1) {
            return null;
        }

        return (int) $match[1] >= 1 ? (int) $match[1] : null;
    }

    public static function isSchedulable(string $frequency): bool
    {
        return $frequency === self::SINGLE_DOSE || self::intervalHours($frequency) !== null;
    }
}
