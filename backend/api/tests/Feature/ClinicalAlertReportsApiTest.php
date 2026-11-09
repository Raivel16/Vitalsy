<?php

namespace Tests\Feature;

use App\Models\AdmissionEncounter;
use App\Models\AlertAcknowledgement;
use App\Models\AlertEscalation;
use App\Models\ClinicalAlert;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/** RF-114: reportes de monitoreo y respuesta a alertas calculados con los registros reales. */
class ClinicalAlertReportsApiTest extends TestCase
{
    use RefreshDatabase;

    private const REPORTS = '/api/v1/clinical-alerts/reports';

    private const NOW = '2026-11-09 18:00:00';

    private const SUPERVISOR = 'enfermera_supervisora';

    private const NURSE = 'enfermera_piso';

    private const RESIDENT = 'medico_residente';

    private const MEDICINE = 'Medicina';

    private const SURGERY = 'Cirugia';

    private const HIGH = 'alta';

    private const MEDIUM = 'media';

    private const NEWS2 = 'news2';

    private const OBSERVATION = 'observacion';

    private const CLOSED = 'cerrada';

    private const ENC_MEDICINE = 'ENC-REP-0001';

    private const ENC_SURGERY = 'ENC-REP-0002';

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow(Carbon::parse(self::NOW));
        $this->encounter(self::ENC_MEDICINE, self::MEDICINE, '1');
        $this->encounter(self::ENC_SURGERY, self::SURGERY, '2');
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    private function encounter(string $encounterId, string $service, string $suffix): void
    {
        AdmissionEncounter::query()->create([
            'encounter_id' => $encounterId,
            'order_number' => "OI-REP-{$suffix}",
            'source' => 'manual',
            'transfer_order_number' => "OT-REP-{$suffix}",
            'patient_name' => "Paciente Reporte {$suffix}",
            'document_type' => 'DNI',
            'document_number' => "7000000{$suffix}",
            'origin_service' => $service,
            'coverage_payer' => 'Essalud',
            'coverage_status' => 'aprobada',
            'coverage_plan' => 'Regular',
            'room' => "60{$suffix}",
            'bed' => 'A',
            'service' => $service,
            'wristband_code' => "BRZ-REP-{$suffix}",
            'record_id' => "EXP-REP-{$suffix}",
            'current_step' => 'cerrado',
            'waiting_reason' => null,
            'deliverables' => [],
            'clinical_payload' => [],
        ]);
    }

    private function asRole(string $role): User
    {
        $user = User::factory()->create(['role' => $role]);
        $this->actingAs($user);

        return $user;
    }

    /** @param array<string, mixed> $overrides */
    private function alert(string $generatedAt, array $overrides = []): ClinicalAlert
    {
        return ClinicalAlert::query()->create(array_merge([
            'encounter_id' => self::ENC_MEDICINE,
            'source' => self::NEWS2,
            'severity' => self::MEDIUM,
            'news2_total' => 4,
            'message' => 'NEWS2 4: requiere verificación.',
            'status' => 'abierta',
            'assigned_role' => self::NURSE,
            'generated_at' => Carbon::parse($generatedAt),
        ], $overrides));
    }

    private function acknowledge(ClinicalAlert $alert, string $role, string $at): void
    {
        AlertAcknowledgement::query()->create([
            'alert_id' => $alert->id,
            'user_id' => null,
            'role' => $role,
            'acknowledged_at' => Carbon::parse($at),
        ]);
    }

    private function escalate(ClinicalAlert $alert, string $toRole, string $at): void
    {
        AlertEscalation::query()->create([
            'alert_id' => $alert->id,
            'to_role' => $toRole,
            'reason' => 'Sin acuse dentro del plazo.',
            'escalated_at' => Carbon::parse($at),
        ]);
    }

    private function seedScenario(): void
    {
        // A: acuse de enfermería a los 3 min (en plazo) y cierre.
        $a = $this->alert('2026-11-05 08:00:00', ['status' => self::CLOSED, 'closed_at' => Carbon::parse('2026-11-05 08:30:00')]);
        $this->acknowledge($a, self::NURSE, '2026-11-05 08:03:00');

        // B: alta, acuse a los 9 min (fuera de plazo), escalada a supervisora, médico notificado que responde a los 10 min.
        $b = $this->alert('2026-11-06 10:00:00', [
            'severity' => self::HIGH,
            'news2_total' => 7,
            'status' => 'medico_en_atencion',
            'medical_notified_at' => Carbon::parse('2026-11-06 10:20:00'),
        ]);
        $this->escalate($b, self::SUPERVISOR, '2026-11-06 10:05:00');
        $this->acknowledge($b, self::SUPERVISOR, '2026-11-06 10:09:00');
        $this->acknowledge($b, self::RESIDENT, '2026-11-06 10:30:00');

        // C: observación en cirugía, escalada al ERR, médico responde a los 20 min (fuera de plazo) y pasa por UCI.
        $c = $this->alert('2026-11-07 12:00:00', [
            'encounter_id' => self::ENC_SURGERY,
            'source' => self::OBSERVATION,
            'severity' => self::HIGH,
            'news2_total' => null,
            'status' => self::CLOSED,
            'medical_notified_at' => Carbon::parse('2026-11-07 12:10:00'),
            'icu_transferred_at' => Carbon::parse('2026-11-07 13:00:00'),
            'closed_at' => Carbon::parse('2026-11-07 15:00:00'),
        ]);
        $this->acknowledge($c, self::NURSE, '2026-11-07 12:04:00');
        $this->acknowledge($c, 'medico_tratante', '2026-11-07 12:30:00');
        $this->escalate($c, 'equipo_respuesta_rapida', '2026-11-07 12:35:00');

        // D: abierta, sin acuse, NEWS2 5.
        $this->alert('2026-11-08 09:00:00', ['news2_total' => 5]);

        // Fuera del período consultado: no debe contarse.
        $this->alert('2026-10-01 09:00:00', ['severity' => self::HIGH]);
    }

    private function period(string $extra = ''): string
    {
        return self::REPORTS.'?from=2026-11-03&to=2026-11-09'.$extra;
    }

    public function test_supervisor_gets_indicators_computed_from_stored_alerts(): void
    {
        $this->seedScenario();
        $this->asRole(self::SUPERVISOR);

        $response = $this->getJson($this->period())->assertOk();

        $response->assertJsonPath('period.from', '2026-11-03')
            ->assertJsonPath('period.to', '2026-11-09')
            ->assertJsonPath('summary.totalAlerts', 4)
            ->assertJsonPath('summary.closedAlerts', 2)
            ->assertJsonPath('summary.activeAlerts', 2)
            ->assertJsonPath('summary.icuTransfers', 1)
            ->assertJsonPath('nurseAcknowledgement.targetMinutes', 5)
            ->assertJsonPath('nurseAcknowledgement.measured', 3)
            ->assertJsonPath('nurseAcknowledgement.pending', 1)
            ->assertJsonPath('nurseAcknowledgement.averageMinutes', 5.3)
            ->assertJsonPath('nurseAcknowledgement.withinTargetPercent', 66.7)
            ->assertJsonPath('escalation.escalatedAlerts', 2)
            ->assertJsonPath('escalation.ratePercent', 50)
            ->assertJsonPath('escalation.toSupervisor', 1)
            ->assertJsonPath('escalation.toRapidResponse', 1)
            ->assertJsonPath('medicalResponse.targetMinutes', 15)
            ->assertJsonPath('medicalResponse.notified', 2)
            ->assertJsonPath('medicalResponse.measured', 2)
            ->assertJsonPath('medicalResponse.averageMinutes', 15)
            ->assertJsonPath('medicalResponse.withinTargetPercent', 50);

        $this->assertSame(
            [['key' => self::HIGH, 'count' => 2], ['key' => self::MEDIUM, 'count' => 2], ['key' => 'baja', 'count' => 0]],
            $response->json('bySeverity'),
        );
        $this->assertContains(['key' => self::OBSERVATION, 'count' => 1], $response->json('bySource'));
        $this->assertContains(['key' => self::CLOSED, 'count' => 2], $response->json('byStatus'));
        $this->assertSame(
            [['band' => '0', 'count' => 0], ['band' => '1-4', 'count' => 1], ['band' => '5-6', 'count' => 1], ['band' => '7+', 'count' => 1]],
            $response->json('news2Distribution'),
        );

        $daily = collect($response->json('daily'))->keyBy('date');
        $this->assertCount(7, $daily);
        $this->assertSame(['date' => '2026-11-06', 'total' => 1, 'alta' => 1, 'media' => 0, 'baja' => 0], $daily['2026-11-06']);
        $this->assertSame(0, $daily['2026-11-03']['total']);
        $this->assertSame([self::SURGERY, self::MEDICINE], $response->json('options.services'));
    }

    public function test_filters_narrow_the_report_by_severity_source_and_service(): void
    {
        $this->seedScenario();
        $this->asRole('jefatura_enfermeria');

        $this->getJson($this->period('&severity=alta'))
            ->assertOk()
            ->assertJsonPath('summary.totalAlerts', 2)
            ->assertJsonPath('filters.severity', self::HIGH);

        $this->getJson($this->period('&source=observacion'))
            ->assertOk()
            ->assertJsonPath('summary.totalAlerts', 1)
            ->assertJsonPath('summary.icuTransfers', 1);

        $this->getJson($this->period('&service='.self::MEDICINE))
            ->assertOk()
            ->assertJsonPath('summary.totalAlerts', 3)
            ->assertJsonPath('filters.service', self::MEDICINE);
    }

    public function test_empty_period_returns_zeros_without_averages(): void
    {
        $this->asRole(self::SUPERVISOR);

        $this->getJson($this->period())
            ->assertOk()
            ->assertJsonPath('summary.totalAlerts', 0)
            ->assertJsonPath('nurseAcknowledgement.averageMinutes', null)
            ->assertJsonPath('nurseAcknowledgement.withinTargetPercent', null)
            ->assertJsonPath('escalation.ratePercent', null)
            ->assertJsonPath('medicalResponse.averageMinutes', null);
    }

    public function test_period_defaults_to_the_last_seven_days(): void
    {
        $this->asRole(self::SUPERVISOR);

        $this->getJson(self::REPORTS)
            ->assertOk()
            ->assertJsonPath('period.from', '2026-11-03')
            ->assertJsonPath('period.to', '2026-11-09');
    }

    public function test_invalid_filters_are_rejected(): void
    {
        $this->asRole(self::SUPERVISOR);

        $this->getJson(self::REPORTS.'?from=2026-11-09&to=2026-11-01')
            ->assertStatus(422)
            ->assertJsonValidationErrors('to');
        $this->getJson(self::REPORTS.'?from=2026-01-01&to=2026-11-01')
            ->assertStatus(422)
            ->assertJsonValidationErrors('from');
        $this->getJson(self::REPORTS.'?severity=critica')
            ->assertStatus(422)
            ->assertJsonValidationErrors('severity');
        $this->getJson(self::REPORTS.'?source=manual')
            ->assertStatus(422)
            ->assertJsonValidationErrors('source');
    }

    public function test_only_supervision_roles_can_read_reports(): void
    {
        foreach ([self::NURSE, self::RESIDENT, 'admision'] as $role) {
            $this->asRole($role);
            $this->getJson(self::REPORTS)->assertForbidden();
        }
    }
}
