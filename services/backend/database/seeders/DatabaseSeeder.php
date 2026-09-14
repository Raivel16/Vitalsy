<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $password = Hash::make('Vitalsy.2026');

        $accounts = [
            ['name' => 'Mesa de admisión', 'email' => 'admision@vitalsy.local', 'role' => 'admision'],
            ['name' => 'Enfermería de piso', 'email' => 'enfermeria@vitalsy.local', 'role' => 'enfermeria'],
            ['name' => 'Médico de guardia', 'email' => 'medico@vitalsy.local', 'role' => 'medico'],
            ['name' => 'Celador de traslado', 'email' => 'celador@vitalsy.local', 'role' => 'celador'],
        ];

        foreach ($accounts as $account) {
            User::query()->updateOrCreate(
                ['email' => $account['email']],
                [...$account, 'password' => $password, 'email_verified_at' => now()],
            );
        }
    }
}
