<?php

namespace Database\Seeders;

use App\Models\Bed;
use App\Models\Ward;
use Illuminate\Database\Seeder;

class CatalogSeeder extends Seeder
{
    public function run(): void
    {
        $medicina = Ward::query()->updateOrCreate(
            ['code' => 'MED-A'],
            ['name' => 'Medicina Interna A', 'specialty' => 'medicina_interna'],
        );

        $cirugia = Ward::query()->updateOrCreate(
            ['code' => 'CIR-B'],
            ['name' => 'Cirugía B', 'specialty' => 'cirugia'],
        );

        $beds = [
            [$medicina->id, '101', 'A', 'mixed', false, 'available'],
            [$medicina->id, '101', 'B', 'mixed', false, 'available'],
            [$medicina->id, '102', 'A', 'female', false, 'available'],
            [$cirugia->id, '201', 'A', 'male', false, 'available'],
            [$cirugia->id, '201', 'B', 'male', true, 'blocked'],
            [$cirugia->id, '202', 'A', 'mixed', false, 'cleaning'],
        ];

        foreach ($beds as [$wardId, $room, $bedCode, $genderPolicy, $isolation, $status]) {
            Bed::query()->updateOrCreate(
                [
                    'ward_id' => $wardId,
                    'room' => $room,
                    'bed_code' => $bedCode,
                ],
                [
                    'gender_policy' => $genderPolicy,
                    'isolation' => $isolation,
                    'status' => $status,
                ],
            );
        }
    }
}
