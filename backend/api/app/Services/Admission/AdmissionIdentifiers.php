<?php

namespace App\Services\Admission;

use App\Models\AdmissionEncounter;

/** Numeración de ingresos, órdenes de traslado, brazaletes y expedientes. */
class AdmissionIdentifiers
{
    private const NON_DIGITS = '/\D+/';

    public function nextEncounterId(): string
    {
        $max = AdmissionEncounter::query()
            ->get()
            ->map(fn (AdmissionEncounter $item) => (int) preg_replace(self::NON_DIGITS, '', $item->encounter_id))
            ->max() ?? 0;

        return 'ENC-'.str_pad((string) ($max + 1), 4, '0', STR_PAD_LEFT);
    }

    /** Asigna la orden de traslado y, si falta, una ubicación provisional del ingreso. */
    public function ensureTransferReady(AdmissionEncounter $encounter): void
    {
        if (! $encounter->transfer_order_number) {
            $encounter->transfer_order_number = $this->nextTransferOrderNumber();
        }
        if (! $encounter->room) {
            $index = AdmissionEncounter::query()->whereNotNull('room')->count() + 1;
            $encounter->room = (string) (300 + $index);
            $encounter->bed = $index % 2 === 0 ? 'B' : 'A';
            $encounter->service = $encounter->service ?: 'Medicina interna';
        }
    }

    public function wristbandCode(AdmissionEncounter $encounter): string
    {
        $parts = preg_split('/\s+/', trim($encounter->patient_name)) ?: [];
        $initials = '';
        foreach (array_slice($parts, 0, 3) as $part) {
            $initials .= mb_strtoupper(mb_substr($part, 0, 1));
        }

        return 'BRZ-'.str_pad($this->digitSuffix($encounter), 4, '0', STR_PAD_LEFT).'-'.($initials ?: 'PX');
    }

    public function recordId(AdmissionEncounter $encounter): string
    {
        return 'EXP-'.str_pad($this->digitSuffix($encounter), 4, '0', STR_PAD_LEFT);
    }

    private function digitSuffix(AdmissionEncounter $encounter): string
    {
        return preg_replace(self::NON_DIGITS, '', $encounter->encounter_id) ?: (string) $encounter->id;
    }

    private function nextTransferOrderNumber(): string
    {
        $year = now()->format('Y');
        $max = AdmissionEncounter::query()
            ->whereNotNull('transfer_order_number')
            ->get()
            ->map(fn (AdmissionEncounter $item) => (int) preg_replace(self::NON_DIGITS, '', (string) $item->transfer_order_number))
            ->max() ?? 0;

        return 'OT-'.$year.'-'.str_pad((string) (($max % 10000) + 1), 4, '0', STR_PAD_LEFT);
    }
}
