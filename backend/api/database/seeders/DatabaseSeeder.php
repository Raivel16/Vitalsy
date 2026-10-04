<?php

namespace Database\Seeders;

use App\Models\User;
use App\Services\Admission\AdmissionBoard;
use App\Support\RoleCatalog;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $plain = env('DEMO_PASSWORD');

        if (is_string($plain) && $plain !== '') {
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
                        'password' => $plain,
                        'email_verified_at' => now(),
                        'is_active' => true,
                    ],
                );
            }
        }

        $this->call(CatalogSeeder::class);

        app(AdmissionBoard::class)->ensureDemo();
    }
}
