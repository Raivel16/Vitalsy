<?php

namespace Tests\Feature;

use App\Models\AdmissionEncounter;
use App\Models\AlertAcknowledgement;
use App\Models\Bed;
use App\Models\BedAssignment;
use App\Models\CleaningOrder;
use App\Models\ClinicalAlert;
use App\Models\PatientExit;
use App\Models\User;
use App\Models\Ward;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/** RF-115: indicadores hospitalarios calculados con camas, ingresos, altas, limpieza y alertas reales. */
class HospitalIndicatorsApiTest extends TestCase
{
    use RefreshDatabase;

    private const URL = '/api/v1/reports/hospital';

    private const NOW = '2026-11-09 18:00:00';

    private const FROM = '2026-11-03';

    private const TO = '2026-11-09';

    private const MED = 'MED';

    private const SUR = 'CIR';

    private const OCCUPIED = 'occupied';

    private const AVAILABLE = 'available';

    private const CLEANING = 'cleaning';

    private const BLOCKED = 'blocked';

    /** @var array<string, Ward> */
    private array $wards = [];

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::parse(self::NOW));
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function asRole(string $role): void
    {
        $this->actingAs(User::factory()->create(['role' => $role]));
    }

    private function ward(string $code, string $name): Ward
    {
        return $this->wards[$code] = Ward::query()->create(['code' => $code, 'name' => $name]);
    }

    private function bed(string $wardCode, string $room, string $status): Bed
    {
        return Bed::query()->create([
            'ward_id' => $this->wards[$wardCode]->id,
            'room' => $room,
            'bed_code' => 'A',
            'status' => $status,
        ]);
    }

    private function encounter(string $id, string $createdAt, ?string $exitedAt, Bed $bed): void
    {
        $encounter = AdmissionEncounter::query()->create([
            'encounter_id' => $id,
            'order_number' => "OI-{$id}",
            'source' => 'manual',
            'transfer_order_number' => "OT-{$id}",
            'patient_name' => "Paciente {$id}",
            'document_type' => 'DNI',
            'document_number' => '7'.substr(md5($id), 0, 7),
            'origin_service' => 'Medicina',
            'coverage_payer' => 'Essalud',
            'coverage_status' => 'aprobada',
            'coverage_plan' => 'Regular',
            'room' => $bed->room,
            'bed' => 'A',
            'service' => 'Medicina',
            'wristband_code' => "BRZ-{$id}",
            'record_id' => "EXP-{$id}",
            'current_step' => 'cerrado',
            'waiting_reason' => null,
            'deliverables' => [],
            'clinical_payload' => [],
        ]);
        $encounter->forceFill(['created_at' => Carbon::parse($createdAt)])->save();

        BedAssignment::query()->create([
            'bed_id' => $bed->id,
            'encounter_id' => $id,
            'assigned_at' => Carbon::parse($createdAt),
            'released_at' => $exitedAt === null ? null : Carbon::parse($exitedAt),
        ]);

        if ($exitedAt !== null) {
            PatientExit::query()->create(['encounter_id' => $id, 'exited_at' => Carbon::parse($exitedAt)]);
        }
    }

    /** @param array<string, mixed> $times */
    private function cleaning(Bed $bed, string $dispatchedAt, array $times = []): void
    {
        CleaningOrder::query()->create([
            'bed_id' => $bed->id,
            'protocol' => 'standard',
            'status' => $times === [] ? 'pendiente' : 'completada',
            'dispatched_at' => Carbon::parse($dispatchedAt),
            'completed_at' => isset($times['completed']) ? Carbon::parse($times['completed']) : null,
            'enabled_at' => isset($times['enabled']) ? Carbon::parse($times['enabled']) : null,
        ]);
    }

    private function alert(string $generatedAt, int $ackMinutes, string $encounterId): void
    {
        $alert = ClinicalAlert::query()->create([
            'encounter_id' => $encounterId,
            'source' => 'news2',
            'severity' => 'media',
            'news2_total' => 4,
            'message' => 'NEWS2 4: requiere verificación.',
            'status' => 'abierta',
            'assigned_role' => 'enfermera_piso',
            'generated_at' => Carbon::parse($generatedAt),
        ]);
        AlertAcknowledgement::query()->create([
            'alert_id' => $alert->id,
            'user_id' => null,
            'role' => 'enfermera_piso',
            'acknowledged_at' => Carbon::parse($generatedAt)->addMinutes($ackMinutes),
        ]);
    }

    /**
     * Medicina: 3 camas (2 ocupadas, 1 libre). Cirugía: 2 camas (1 en limpieza, 1 bloqueada).
     * Ingresos en el período: E1, E2, E3; altas: E1, E2, E4 (estancias de 48 h, 12 h y 144 h).
     */
    private function seedHospital(): void
    {
        $this->ward(self::MED, 'Medicina');
        $this->ward(self::SUR, 'Cirugía');
        $medOccupied = $this->bed(self::MED, '101', self::OCCUPIED);
        $medOccupiedTwo = $this->bed(self::MED, '102', self::OCCUPIED);
        $this->bed(self::MED, '103', self::AVAILABLE);
        $surCleaning = $this->bed(self::SUR, '201', self::CLEANING);
        $this->bed(self::SUR, '202', self::BLOCKED);

        $this->encounter('ENC-H-1', '2026-11-04 10:00:00', '2026-11-06 10:00:00', $medOccupiedTwo);
        $this->encounter('ENC-H-2', '2026-11-05 08:00:00', '2026-11-05 20:00:00', $surCleaning);
        $this->encounter('ENC-H-3', '2026-11-08 09:00:00', null, $medOccupied);
        $this->encounter('ENC-H-4', '2026-11-02 08:00:00', '2026-11-08 08:00:00', $medOccupiedTwo);

        // Recambio: 40 min con habilitación, 20 min solo con limpieza terminada, una orden pendiente y otra fuera del período.
        $this->cleaning($medOccupiedTwo, '2026-11-05 10:00:00', ['completed' => '2026-11-05 10:30:00', 'enabled' => '2026-11-05 10:40:00']);
        $this->cleaning($surCleaning, '2026-11-06 09:00:00', ['completed' => '2026-11-06 09:20:00']);
        $this->cleaning($surCleaning, '2026-11-06 12:00:00');
        $this->cleaning($surCleaning, '2026-10-20 09:00:00', ['completed' => '2026-10-20 10:00:00']);

        $this->alert('2026-11-05 08:00:00', 3, 'ENC-H-1');
        $this->alert('2026-11-06 10:00:00', 9, 'ENC-H-1');
    }

    /** @return array<string, mixed> */
    private function report(string $query = ''): array
    {
        $this->asRole('jefatura_enfermeria');
        $base = 'from='.self::FROM.'&to='.self::TO;

        return $this->getJson(self::URL.'?'.$base.$query)->assertOk()->json();
    }

    public function test_exige_sesion_y_un_rol_de_supervision(): void
    {
        $this->getJson(self::URL)->assertUnauthorized();

        foreach (['admision', 'enfermera_piso', 'medico_residente'] as $role) {
            $this->asRole($role);
            $this->getJson(self::URL)->assertForbidden();
        }

        foreach (['jefatura_enfermeria', 'enfermera_supervisora', 'gestion_camas'] as $role) {
            $this->asRole($role);
            $this->getJson(self::URL)->assertOk();
        }
    }

    public function test_sin_datos_devuelve_ceros_y_valores_nulos(): void
    {
        $report = $this->report();

        $this->assertSame(0, $report['beds']['total']);
        $this->assertNull($report['beds']['occupancyPercent']);
        $this->assertSame(0, $report['flow']['admissions']);
        $this->assertNull($report['flow']['averageStayHours']);
        $this->assertNull($report['turnover']['averageMinutes']);
        $this->assertSame(0, $report['alerts']['totalAlerts']);
    }

    public function test_calcula_la_ocupacion_de_camas_por_sala(): void
    {
        $this->seedHospital();

        $beds = $this->report()['beds'];

        $this->assertSame(5, $beds['total']);
        $this->assertSame(2, $beds['occupied']);
        $this->assertSame(1, $beds['available']);
        $this->assertSame(1, $beds['cleaning']);
        $this->assertSame(1, $beds['blocked']);
        $this->assertEquals(40.0, $beds['occupancyPercent']);

        $byWard = collect($beds['byWard'])->keyBy('code');
        $this->assertSame(3, $byWard[self::MED]['total']);
        $this->assertSame(2, $byWard[self::MED]['occupied']);
        $this->assertSame(66.7, $byWard[self::MED]['occupancyPercent']);
        $this->assertEquals(0.0, $byWard[self::SUR]['occupancyPercent']);
    }

    public function test_cuenta_ingresos_altas_y_estancia_promedio_del_periodo(): void
    {
        $this->seedHospital();

        $flow = $this->report()['flow'];

        $this->assertSame(3, $flow['admissions']);
        $this->assertSame(3, $flow['discharges']);
        $this->assertEquals(68.0, $flow['averageStayHours']);

        $daily = collect($flow['daily'])->keyBy('date');
        $this->assertCount(7, $flow['daily']);
        $this->assertSame(['admissions' => 1, 'discharges' => 0], $this->counts($daily['2026-11-04']));
        $this->assertSame(['admissions' => 1, 'discharges' => 1], $this->counts($daily['2026-11-05']));
        $this->assertSame(['admissions' => 0, 'discharges' => 1], $this->counts($daily['2026-11-06']));
        $this->assertSame(['admissions' => 1, 'discharges' => 1], $this->counts($daily['2026-11-08']));
        $this->assertSame(['admissions' => 0, 'discharges' => 0], $this->counts($daily['2026-11-07']));
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array{admissions: int, discharges: int}
     */
    private function counts(array $row): array
    {
        return ['admissions' => $row['admissions'], 'discharges' => $row['discharges']];
    }

    public function test_mide_el_tiempo_de_recambio_de_cama(): void
    {
        $this->seedHospital();

        $turnover = $this->report()['turnover'];

        $this->assertSame(2, $turnover['completed']);
        $this->assertSame(1, $turnover['pending']);
        $this->assertEquals(30.0, $turnover['averageMinutes']);
    }

    public function test_resume_el_cumplimiento_del_plazo_de_acuse_de_alertas(): void
    {
        $this->seedHospital();

        $alerts = $this->report()['alerts'];

        $this->assertSame(2, $alerts['totalAlerts']);
        $this->assertSame(5, $alerts['nurseAcknowledgement']['targetMinutes']);
        $this->assertEquals(50.0, $alerts['nurseAcknowledgement']['withinTargetPercent']);
    }

    public function test_el_filtro_de_sala_limita_camas_flujo_y_recambio(): void
    {
        $this->seedHospital();

        $report = $this->report('&ward='.self::MED);

        $this->assertSame(self::MED, $report['filters']['ward']);
        $this->assertSame(3, $report['beds']['total']);
        $this->assertSame(2, $report['flow']['admissions']);
        $this->assertSame(2, $report['flow']['discharges']);
        $this->assertEquals(96.0, $report['flow']['averageStayHours']);
        $this->assertSame(1, $report['turnover']['completed']);
        $this->assertEquals(40.0, $report['turnover']['averageMinutes']);
        $this->assertSame(['CIR', 'MED'], collect($report['options']['wards'])->pluck('code')->sort()->values()->all());
    }

    public function test_valida_fechas_sala_y_longitud_del_periodo(): void
    {
        $this->asRole('jefatura_enfermeria');
        $this->seedHospital();

        $this->getJson(self::URL.'?from=2026-11-09&to=2026-11-01')->assertStatus(422)->assertJsonValidationErrors('to');
        $this->getJson(self::URL.'?from=09/11/2026')->assertStatus(422)->assertJsonValidationErrors('from');
        $this->getJson(self::URL.'?from=2026-01-01&to=2026-11-09')->assertStatus(422)->assertJsonValidationErrors('from');
        $this->getJson(self::URL.'?ward=NOEXISTE')->assertStatus(422)->assertJsonValidationErrors('ward');
    }

    public function test_sin_fechas_usa_los_ultimos_siete_dias(): void
    {
        $this->seedHospital();
        $this->asRole('gestion_camas');

        $report = $this->getJson(self::URL)->assertOk()->json();

        $this->assertSame(self::FROM, $report['period']['from']);
        $this->assertSame(self::TO, $report['period']['to']);
    }
}
