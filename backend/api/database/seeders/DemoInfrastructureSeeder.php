<?php

namespace Database\Seeders;

use App\Models\Ward;
use Illuminate\Database\Seeder;

/**
 * Infraestructura de demostración para probar (~34 camas en 4 pabellones, con variedad de género y
 * aislamiento). Una institución real la reemplaza desde «Infraestructura de camas» (RF-110–112).
 */
class DemoInfrastructureSeeder extends Seeder
{
    use SeedsInfrastructure;

    public function run(): void
    {
        $this->rooms($this->seedWard('MED-A', 'Medicina Interna A', 'medicina_interna'), [
            ['103', 2, 'male', false], ['104', 2, 'female', false], ['105', 2, 'mixed', false], ['106', 2, 'mixed', true],
        ]);
        $this->rooms($this->seedWard('CIR-B', 'Cirugía B', 'cirugia'), [
            ['203', 2, 'male', false], ['204', 2, 'female', false], ['205', 2, 'mixed', true],
        ]);
        $this->rooms($this->seedWard('UCI-C', 'Cuidados Intensivos C', 'cuidados_intensivos'), [
            ['501', 2, 'mixed', false], ['502', 2, 'mixed', false], ['503', 2, 'mixed', true],
        ]);
        $this->rooms($this->seedWard('PED-D', 'Pediatría D', 'pediatria'), [
            ['601', 2, 'mixed', false], ['602', 2, 'mixed', false], ['603', 2, 'mixed', false], ['604', 2, 'mixed', true],
        ]);
    }

    /** @param list<array{0: string, 1: int, 2: string, 3: bool}> $rooms */
    private function rooms(?Ward $ward, array $rooms): void
    {
        if ($ward === null) {
            return;
        }
        foreach ($rooms as [$room, $count, $gender, $isolation]) {
            for ($i = 0; $i < $count; $i++) {
                $this->seedBed($ward, $room, chr(ord('A') + $i), $gender, $isolation);
            }
        }
    }
}
