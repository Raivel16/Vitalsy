<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class CatalogSeeder extends Seeder
{
    use SeedsInfrastructure;

    public function run(): void
    {
        $medicina = $this->seedWard('MED-A', 'Medicina Interna A', 'medicina_interna');
        $cirugia = $this->seedWard('CIR-B', 'Cirugía B', 'cirugia');

        $beds = [
            [$medicina, '101', 'A', 'mixed', false, 'available'],
            [$medicina, '101', 'B', 'mixed', false, 'available'],
            [$medicina, '102', 'A', 'female', false, 'available'],
            [$cirugia, '201', 'A', 'male', false, 'available'],
            [$cirugia, '201', 'B', 'male', true, 'blocked'],
            [$cirugia, '202', 'A', 'mixed', false, 'cleaning'],
        ];

        foreach ($beds as [$ward, $room, $bedCode, $genderPolicy, $isolation, $status]) {
            if ($ward !== null) {
                $this->seedBed($ward, $room, $bedCode, $genderPolicy, $isolation, $status);
            }
        }
    }
}
