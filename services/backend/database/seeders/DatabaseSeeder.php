<?php

namespace Database\Seeders;

use App\Models\User;
use App\Services\Admission\AdmissionBoard;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $password = Hash::make('Vitalsy.2026');

        $accounts = [
            ['name' => 'Mesa de admisión', 'email' => 'admision@vitalsy.local', 'role' => 'admision'],
            ['name' => 'Camillero de traslado', 'email' => 'camillero@vitalsy.local', 'role' => 'camillero'],
            ['name' => 'Enfermera de piso', 'email' => 'enfermera_piso@vitalsy.local', 'role' => 'enfermera_piso'],
            ['name' => 'Auxiliar de enfermería', 'email' => 'auxiliar_enfermeria@vitalsy.local', 'role' => 'auxiliar_enfermeria'],
            ['name' => 'Médico residente', 'email' => 'medico_residente@vitalsy.local', 'role' => 'medico_residente'],
            ['name' => 'Médico tratante', 'email' => 'medico_tratante@vitalsy.local', 'role' => 'medico_tratante'],
        ];

        User::query()->whereIn('email', [
            'celador@vitalsy.local',
            'enfermeria@vitalsy.local',
            'medico@vitalsy.local',
        ])->delete();

        foreach ($accounts as $account) {
            User::query()->updateOrCreate(
                ['email' => $account['email']],
                [...$account, 'password' => $password, 'email_verified_at' => now(), 'is_active' => true],
            );
        }

        $this->call(CatalogSeeder::class);

        app(AdmissionBoard::class)->ensureDemo();
    }
}
