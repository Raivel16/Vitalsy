<?php

namespace Database\Seeders;

use App\Models\Bed;
use App\Models\Ward;

/**
 * Siembra pabellones y camas respetando al administrador (RF-111): lo que borró
 * (borrado lógico) no se resucita al volver a sembrar.
 */
trait SeedsInfrastructure
{
    protected function seedWard(string $code, string $name, string $specialty): ?Ward
    {
        if (Ward::onlyTrashed()->where('code', $code)->exists()) {
            return null;
        }

        return Ward::query()->updateOrCreate(['code' => $code], ['name' => $name, 'specialty' => $specialty]);
    }

    protected function seedBed(Ward $ward, string $room, string $code, string $gender, bool $isolation, string $status = 'available'): void
    {
        $key = ['ward_id' => $ward->id, 'room' => $room, 'bed_code' => $code];
        if (Bed::onlyTrashed()->where($key)->exists()) {
            return;
        }

        Bed::query()->updateOrCreate($key, ['gender_policy' => $gender, 'isolation' => $isolation, 'status' => $status]);
    }
}
