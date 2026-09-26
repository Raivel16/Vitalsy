<?php

namespace Database\Seeders;

use App\Models\User;
use App\Services\Admission\AdmissionBoard;
use App\Support\RoleCatalog;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $password = Hash::make('Vitalsy.2026');

        // Nombres de cortesía cuando la cuenta demo no se llama igual que el rol.
        $displayNames = [
            'admision' => 'Mesa de admisión',
            'camillero' => 'Camillero de traslado',
        ];

        User::query()->whereIn('email', [
            'celador@vitalsy.local',
            'enfermeria@vitalsy.local',
            'medico@vitalsy.local',
        ])->delete();

        foreach (RoleCatalog::all() as $role) {
            User::query()->updateOrCreate(
                ['email' => "{$role}@vitalsy.local"],
                [
                    'name' => $displayNames[$role] ?? RoleCatalog::label($role),
                    'role' => $role,
                    'password' => $password,
                    'email_verified_at' => now(),
                    'is_active' => true,
                ],
            );
        }

        $this->call(CatalogSeeder::class);

        app(AdmissionBoard::class)->ensureDemo();
    }
}
