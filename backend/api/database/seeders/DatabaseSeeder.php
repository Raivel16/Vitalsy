<?php

namespace Database\Seeders;

use App\Models\User;
use App\Services\Admission\AdmissionBoard;
use App\Support\RoleCatalog;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DatabaseSeeder extends Seeder
{
    /**
     * Retira cuentas heredadas: se eliminan si no poseen registros de trazabilidad (RNF-07);
     * si firmaron/confirmaron algo (entregas, dosis, notas, acuses) solo se desactivan.
     *
     * @param  list<string>  $emails
     */
    private function retireLegacyUsers(array $emails): void
    {
        $owners = [
            'handovers' => ['from_user_id', 'to_user_id'],
            'medical_evolution_notes' => ['author_user_id'],
            'medication_administrations' => ['nurse_user_id'],
            'alert_events' => ['user_id'],
            'alert_acknowledgements' => ['user_id'],
            // FK en cascada: borrar al usuario destruiria turnos, asignaciones, ausencias y confirmaciones.
            'staff_shifts' => ['user_id'],
            'daily_patient_assignments' => ['nurse_user_id'],
            'staff_absences' => ['user_id'],
            'retainer_confirmations' => ['user_id'],
            'patient_exits' => ['confirmed_by'],
            'discharge_orders' => ['ordered_by'],
            'epicrisis_documents' => ['authored_by'],
        ];

        foreach (User::query()->whereIn('email', $emails)->get() as $user) {
            $owns = false;
            foreach ($owners as $table => $columns) {
                foreach ($columns as $column) {
                    if (Schema::hasTable($table) && DB::table($table)->where($column, $user->id)->exists()) {
                        $owns = true;
                        break 2;
                    }
                }
            }

            if ($owns) {
                $user->forceFill(['is_active' => false, 'deactivated_at' => now()])->save();
                $this->command?->warn("Cuenta heredada {$user->email} con registros firmados: desactivada, no eliminada.");
            } else {
                $user->delete();
            }
        }
    }

    public function run(): void
    {
        $plain = env('DEMO_PASSWORD');

        if (is_string($plain) && $plain !== '') {
            $displayNames = [
                'admision' => 'Mesa de admisión',
                'camillero' => 'Camillero de traslado',
            ];

            $this->retireLegacyUsers([
                'celador@vitalsy.local',
                'enfermeria@vitalsy.local',
                'medico@vitalsy.local',
            ]);

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

        // Después de ensureDemo(): esa carga solo corre si aún no hay ingresos.
        $this->call(DemoPeopleSeeder::class);
    }
}
