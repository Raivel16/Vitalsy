<?php

namespace Tests\Feature;

use App\Models\AdmissionEncounter;
use App\Models\ClinicalAlert;
use App\Models\MedicationAdministration;
use App\Models\MonitoringSchedule;
use App\Models\Prescription;
use App\Models\PrescriptionItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class MonitoringControlsAndComplianceTest extends TestCase
{
    private const V_12_00_00 = '2026-09-26 12:00:00';

    use RefreshDatabase;

    private function encounter(): AdmissionEncounter
    {
        return AdmissionEncounter::query()->create([
            'encounter_id' => 'ENC-CTRL-0001',
            'order_number' => 'OI-2026-CTRL-1',
            'source' => 'manual',
            'patient_name' => 'Paciente Controles Demo',
            'document_type' => 'DNI',
            'document_number' => '99887766',
            'origin_service' => 'Medicina',
            'coverage_payer' => 'Essalud',
            'coverage_status' => 'aprobada',
            'coverage_plan' => 'Regular',
            'room' => '210',
            'bed' => 'A',
            'service' => 'Medicina',
            'wristband_code' => 'BRZ-CTRL-0001',
            'record_id' => 'EXP-CTRL-0001',
            'current_step' => 'cerrado',
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

    public function test_nurse_lists_and_completes_a_due_monitoring_control(): void
    {
        Carbon::setTestNow(self::V_12_00_00);
        $this->encounter();
        MonitoringSchedule::query()->create([
            'encounter_id' => 'ENC-CTRL-0001',
            'next_due_at' => Carbon::parse('2026-09-26 11:30:00'),
            'frequency_minutes' => 120,
            'created_by' => null,
        ]);
        $this->asRole('enfermera_piso');

        $this->getJson('/api/v1/inpatient-care/monitoring-controls')
            ->assertOk()
            ->assertJsonPath('controls.0.encounterId', 'ENC-CTRL-0001')
            ->assertJsonPath('controls.0.overdue', true);

        $this->postJson('/api/v1/inpatient-care/encounters/ENC-CTRL-0001/monitoring-controls/complete', [
            'respiratoryRate' => 16,
            'oxygenSaturation' => 98,
            'systolicBloodPressure' => 120,
            'diastolicBloodPressure' => 80,
            'pulse' => 72,
            'temperature' => 36.6,
            'consciousness' => 'alert',
        ])->assertOk()
            ->assertJsonPath('reading.news2.total', 0);

        $schedule = MonitoringSchedule::query()->where('encounter_id', 'ENC-CTRL-0001')->firstOrFail();
        $this->assertSame('2026-09-26 14:00:00', $schedule->next_due_at->toDateTimeString());
    }

    public function test_overdue_control_opens_a_compliance_alert_for_the_floor_nurse(): void
    {
        Carbon::setTestNow(self::V_12_00_00);
        $this->encounter();
        MonitoringSchedule::query()->create([
            'encounter_id' => 'ENC-CTRL-0001',
            'next_due_at' => Carbon::parse('2026-09-26 11:00:00'),
            'frequency_minutes' => 60,
        ]);

        $this->artisan('alerts:process-slas')->assertSuccessful();

        $alert = ClinicalAlert::query()->where('compliance_key', 'control:ENC-CTRL-0001')->firstOrFail();
        $this->assertSame('control', $alert->source);
        $this->assertSame('enfermera_piso', $alert->assigned_role);
        $this->assertSame('abierta', $alert->status);

        $this->asRole('enfermera_piso');
        $this->getJson('/api/v1/clinical-alerts/inbox')
            ->assertOk()
            ->assertJsonPath('alerts.0.complianceKey', 'control:ENC-CTRL-0001');
    }

    public function test_overdue_emar_dose_opens_compliance_alert_and_closes_when_administered(): void
    {
        Carbon::setTestNow(self::V_12_00_00);
        $this->encounter();
        $prescription = Prescription::query()->create([
            'encounter_id' => 'ENC-CTRL-0001',
            'status' => 'activo',
            'signed_at' => now(),
            'prescribed_by' => User::factory()->create(['role' => 'medico_tratante'])->id,
        ]);
        $item = PrescriptionItem::query()->create([
            'prescription_id' => $prescription->id,
            'drug_name' => 'Paracetamol',
            'dose' => '1 g',
            'route' => 'VO',
            'frequency' => 'cada 8 horas',
        ]);
        $dose = MedicationAdministration::query()->create([
            'encounter_id' => 'ENC-CTRL-0001',
            'prescription_item_id' => $item->id,
            'scheduled_at' => Carbon::parse('2026-09-26 11:00:00'),
            'status' => 'pendiente',
        ]);

        $this->artisan('alerts:process-slas')->assertSuccessful();
        $this->assertDatabaseHas('clinical_alerts', [
            'compliance_key' => 'emar:'.$dose->id,
            'source' => 'emar',
            'status' => 'abierta',
        ]);

        $nurse = $this->asRole('enfermera_piso');
        $this->postJson("/api/v1/inpatient-care/encounters/ENC-CTRL-0001/emar/{$dose->id}/administer", [
            'patientBarcode' => 'BRZ-CTRL-0001',
            'drugBarcode' => 'DRUG-PARACETAMOL-1G',
            'sign' => true,
        ])->assertOk();

        $this->assertSame('cerrada', ClinicalAlert::query()->where('compliance_key', 'emar:'.$dose->id)->value('status'));
        $this->assertSame($nurse->id, $dose->fresh()->nurse_user_id);
    }
}
