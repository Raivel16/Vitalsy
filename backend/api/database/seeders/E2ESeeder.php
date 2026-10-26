<?php

namespace Database\Seeders;

use App\Models\Bed;
use App\Models\Ward;
use Illuminate\Database\Seeder;
use RuntimeException;

/**
 * RNF-18: datos de la suite E2E. Siembra lo mismo que DatabaseSeeder y añade
 * pabellones con camas suficientes para que las pruebas no compitan por lechos.
 */
class E2ESeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment('e2e')) {
            throw new RuntimeException('E2ESeeder solo se ejecuta con APP_ENV=e2e.');
        }

        $this->call(DatabaseSeeder::class);

        $wards = [
            ['MED-E2E-1', 'Medicina E2E 1', 'medicina_interna', 5],
            ['MED-E2E-2', 'Medicina E2E 2', 'medicina_interna', 6],
            ['MED-E2E-3', 'Medicina E2E 3', 'medicina_interna', 7],
            ['CIR-E2E-1', 'Cirugía E2E 1', 'cirugia', 8],
            ['CIR-E2E-2', 'Cirugía E2E 2', 'cirugia', 9],
        ];

        // [política de género, aislamiento, estado] por lecho; sala = piso + índice.
        $layout = [
            ...array_fill(0, 4, ['mixed', false, 'available']),
            ...array_fill(0, 3, ['male', false, 'available']),
            ...array_fill(0, 3, ['female', false, 'available']),
            ...array_fill(0, 2, ['mixed', true, 'available']),
            ['mixed', false, 'blocked'],
            ['mixed', false, 'cleaning'],
        ];

        foreach ($wards as [$code, $name, $specialty, $floor]) {
            $ward = Ward::query()->updateOrCreate(
                ['code' => $code],
                ['name' => $name, 'specialty' => $specialty],
            );

            foreach ($layout as $index => [$genderPolicy, $isolation, $status]) {
                Bed::query()->updateOrCreate(
                    [
                        'ward_id' => $ward->id,
                        'room' => sprintf('%d%02d', $floor, intdiv($index, 2) + 1),
                        'bed_code' => $index % 2 === 0 ? 'A' : 'B',
                    ],
                    [
                        'gender_policy' => $genderPolicy,
                        'isolation' => $isolation,
                        'status' => $status,
                    ],
                );
            }
        }

        $this->seedVolumeWards();
    }

    /**
     * Cada ingreso de la suite ocupa un lecho del censo antes del consentimiento (HP-07), así que
     * hace falta un fondo grande de camas libres y neutras para que las pruebas no se las agoten.
     */
    private function seedVolumeWards(): void
    {
        foreach ([10, 11, 12, 13] as $floor) {
            $ward = Ward::query()->updateOrCreate(
                ['code' => "VOL-E2E-{$floor}"],
                ['name' => "Volumen E2E {$floor}", 'specialty' => 'medicina_interna'],
            );

            for ($index = 0; $index < 80; $index++) {
                Bed::query()->updateOrCreate(
                    [
                        'ward_id' => $ward->id,
                        'room' => sprintf('%d%02d', $floor, intdiv($index, 2) + 1),
                        'bed_code' => $index % 2 === 0 ? 'A' : 'B',
                    ],
                    ['gender_policy' => 'mixed', 'isolation' => false, 'status' => 'available'],
                );
            }
        }
    }
}
