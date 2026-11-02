<?php

namespace App\Support;

/**
 * RF-25: frecuencias que el médico elige en CPOE. La misma lista vive en
 * `frontend/web/src/modules/cpoe/domain/frequencies.ts`.
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

    private const DEFAULT_HOURS = 8;

    /**
     * Horas entre dosis, o null si no se repite. El texto libre solo llega de planes anteriores y del BPMH.
     */
    public static function intervalHours(string $frequency): ?int
    {
        if ($frequency === self::SINGLE_DOSE) {
            return null;
        }

        if (preg_match('/(\d+)\s*h/i', $frequency, $match) === 1) {
            return max(1, (int) $match[1]);
        }

        return self::DEFAULT_HOURS;
    }
}
