<?php

namespace Database\Seeders;

use App\Models\AdmissionEncounter;
use App\Models\DailyPatientAssignment;
use App\Models\StaffShift;
use App\Models\StaffShiftPlan;
use App\Models\User;
use App\Models\VitalSignReading;
use Illuminate\Database\Seeder;

/**
 * Personas ficticias para probar los procesos con nombres distinguibles (todas con la
 * contraseña demo). Es idempotente: se puede ejecutar varias veces con `db:seed`.
 */
class DemoPeopleSeeder extends Seeder
{
    /** @var list<array{0: string, 1: string, 2: string}> nombre, correo (sin dominio), rol */
    private const PEOPLE = [
        ['Rosa Quispe Mamani', 'rosa.quispe', 'enfermera_piso'],
        ['Lucía Mendoza Rivera', 'lucia.mendoza', 'enfermera_piso'],
        ['Carmen Huamán Soto', 'carmen.huaman', 'enfermera_piso'],
        ['Patricia Salas Vega', 'patricia.salas', 'enfermera_piso'],
        ['Elena Vargas Cáceres', 'elena.vargas', 'enfermera_piso'],
        ['Mariela Torres Díaz', 'mariela.torres', 'enfermera_piso'],
        ['Andrés Castillo Ortiz', 'andres.castillo', 'medico_residente'],
        ['Valeria Núñez Prado', 'valeria.nunez', 'medico_residente'],
        ['Ricardo Paredes Luna', 'ricardo.paredes', 'medico_tratante'],
        ['Sofía Landa Herrera', 'sofia.landa', 'medico_tratante'],
        ['Jorge Ramos Pinedo', 'jorge.ramos', 'auxiliar_enfermeria'],
        ['Diana Flores Chávez', 'diana.flores', 'admision'],
        ['Marco Rivas Condori', 'marco.rivas', 'camillero'],
        ['Teresa Ibáñez Roca', 'teresa.ibanez', 'enfermera_supervisora'],
        ['Álvaro Guerra Medina', 'alvaro.guerra', 'equipo_respuesta_rapida'],
        ['Claudia Rojas Bellido', 'claudia.rojas', 'trabajo_social'],
        ['Hugo Palacios Zeña', 'hugo.palacios', 'altas_caja'],
        ['Natalia Cruz Arce', 'natalia.cruz', 'gestion_camas'],
        ['Pedro Ccori Yupanqui', 'pedro.ccori', 'servicios_generales'],
        ['Gloria Valdivia Peña', 'gloria.valdivia', 'jefatura_enfermeria'],
        ['Mónica Aguilar Tello', 'monica.aguilar', 'recursos_humanos'],
        ['Iván Salazar Bustos', 'ivan.salazar', 'administrador_accesos'],
    ];

    public function run(): void
    {
        $plain = env('DEMO_PASSWORD');
        if (! is_string($plain) || $plain === '') {
            return;
        }

        foreach (self::PEOPLE as [$name, $local, $role]) {
            User::query()->updateOrCreate(
                ['email' => "{$local}@vitalsy.local"],
                [
                    'name' => $name,
                    'role' => $role,
                    'password' => $plain,
                    'email_verified_at' => now(),
                    'is_active' => true,
                ],
            );
        }

        $this->practiceRelief();
    }

    /**
     * Escenario de práctica del relevo: Rosa termina su turno en 15 minutos y Lucía entra
     * después (mismo servicio), con tres pacientes de NEWS2 distinto. La ventana de entrega
     * dura unas 3 horas desde que se siembra.
     */
    private function practiceRelief(): void
    {
        $outgoing = User::query()->where('email', 'rosa.quispe@vitalsy.local')->first();
        $incoming = User::query()->where('email', 'lucia.mendoza@vitalsy.local')->first();
        $other = User::query()->where('email', 'elena.vargas@vitalsy.local')->first();
        if (! $outgoing || ! $incoming || ! $other) {
            return;
        }

        $boundary = now()->addMinutes(15)->startOfMinute();
        $unit = 'Medicina Interna A';
        $plan = StaffShiftPlan::query()->firstOrCreate(
            ['year_month' => now()->format('Y-m')],
            ['published_at' => now()],
        );

        StaffShift::query()
            ->where('plan_id', $plan->id)
            ->whereIn('user_id', [$outgoing->id, $incoming->id, $other->id])
            ->where('ends_at', '>=', now()->subDay())
            ->where('starts_at', '<=', now()->addDay())
            ->delete();
        StaffShift::query()->insert([
            ['plan_id' => $plan->id, 'user_id' => $outgoing->id, 'starts_at' => $boundary->copy()->subHours(12), 'ends_at' => $boundary, 'unit' => $unit, 'created_at' => now(), 'updated_at' => now()],
            ['plan_id' => $plan->id, 'user_id' => $incoming->id, 'starts_at' => $boundary, 'ends_at' => $boundary->copy()->addHours(12), 'unit' => $unit, 'created_at' => now(), 'updated_at' => now()],
            ['plan_id' => $plan->id, 'user_id' => $other->id, 'starts_at' => $boundary->copy()->subHours(12), 'ends_at' => $boundary->copy()->addHours(12), 'unit' => $unit, 'created_at' => now(), 'updated_at' => now()],
        ]);

        $patients = [
            ['ENC-PRAC-1', 'Beatriz Alvarado Núñez', '70010001', '301', 'A', 8],
            ['ENC-PRAC-2', 'Fernando Ugarte Salas', '70010002', '301', 'B', 3],
            ['ENC-PRAC-3', 'Isabel Cáceres Montes', '70010003', '302', 'A', 0],
        ];
        $date = $boundary->toDateString();
        DailyPatientAssignment::query()->whereIn('encounter_id', array_column($patients, 0))->delete();

        foreach ($patients as $index => [$id, $name, $document, $room, $bed, $news2]) {
            AdmissionEncounter::query()->updateOrCreate(
                ['encounter_id' => $id],
                [
                    'order_number' => "OI-{$id}",
                    'source' => 'demo',
                    'patient_name' => $name,
                    'document_type' => 'DNI',
                    'document_number' => $document,
                    'origin_service' => 'Emergencia adultos',
                    'coverage_payer' => 'SIS',
                    'coverage_status' => 'aprobada',
                    'coverage_plan' => 'SIS Gratuito',
                    'room' => $room,
                    'bed' => $bed,
                    'service' => 'Medicina interna',
                    'current_step' => 'cerrado',
                    'deliverables' => [],
                    'clinical_payload' => [],
                ],
            );
            VitalSignReading::query()->where('encounter_id', $id)->delete();
            VitalSignReading::query()->create([
                'encounter_id' => $id,
                'rr' => 16 + $news2,
                'spo2' => 98 - $news2,
                'sbp' => 120 - $news2 * 3,
                'pulse' => 72 + $news2 * 5,
                'temperature' => 36.8,
                'news2_total' => $news2,
                'recorded_at' => now(),
            ]);
            DailyPatientAssignment::query()->create([
                'shift_date' => $date,
                'nurse_user_id' => $index < 2 ? $outgoing->id : $other->id,
                'encounter_id' => $id,
                'news2_weight' => $news2,
            ]);
        }
    }
}
