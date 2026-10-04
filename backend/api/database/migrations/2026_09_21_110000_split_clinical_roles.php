<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')->where('role', 'enfermeria')->update(['role' => 'enfermera_piso']);
        DB::table('users')->where('role', 'medico')->update(['role' => 'medico_residente']);

        DB::table('users')->where('email', 'enfermeria@vitalsy.local')->update([
            'email' => 'enfermera_piso@vitalsy.local',
            'name' => 'Enfermera de piso',
            'role' => 'enfermera_piso',
        ]);

        DB::table('users')->where('email', 'medico@vitalsy.local')->update([
            'email' => 'medico_residente@vitalsy.local',
            'name' => 'Médico residente',
            'role' => 'medico_residente',
        ]);
    }

    public function down(): void
    {
        DB::table('users')->where('role', 'enfermera_piso')->update(['role' => 'enfermeria']);
        DB::table('users')->where('role', 'medico_residente')->update(['role' => 'medico']);
    }
};
