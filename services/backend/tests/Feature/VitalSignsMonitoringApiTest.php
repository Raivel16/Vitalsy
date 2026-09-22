<?php

namespace Tests\Feature;

use App\Models\AdmissionEncounter;
use App\Models\ClinicalAlert;
use App\Models\MonitoringSchedule;
use App\Models\User;
use App\Models\VitalSignReading;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class VitalSignsMonitoringApiTest extends TestCase
{
    use RefreshDatabase;

    private function inpatientEncounter(string $encounterId = 'ENC-HOSP-0001'): AdmissionEncounter
    {
        return AdmissionEncounter::query()->create([
            'encounter_id' => $encounterId,
            'order_number' => 'OI-2026-VS-1',
            'source' => 'manual',
            'transfer_order_number' => 'OT-2026-VS-1',
            'patient_name' => 'Paciente Hospitalizado Demo',
            'document_type' => 'DNI',
            'document_number' => '99887766',
            'origin_service' => 'Medicina',
            'coverage_payer' => 'Essalud',
            'coverage_status' => 'aprobada',
            'coverage_plan' => 'Regular',
            'room' => '401',
            'bed' => 'A',
            'service' => 'Medicina',
            'wristband_code' => 'BRZ-VS-0001',
            'record_id' => 'EXP-VS-0001',
            'current_step' => 'cerrado',
            'waiting_reason' => null,
            'deliverables' => [],
            'clinical_payload' => [],
        ]);
    }

    private function asRole(string $role): static
    {
        return $this->actingAs(User::factory()->create(['role' => $role]));
    }

    public function test_manual_vitals_with_news2_zero_schedules_next_control_in_12_hours(): void
    {
        Carbon::setTestNow('2026-09-21 10:00:00');
        $this->inpatientEncounter();
        $this->asRole('enfermera_piso');

        $this->postJson('/api/v1/inpatient-care/encounters/ENC-HOSP-0001/vital-signs', [
            'respiratoryRate' => 16,
            'oxygenSaturation' => 98,
            'systolicBloodPressure' => 120,
            'pulse' => 72,
            'temperature' => 36.8,
            'consciousness' => 'alert',
            'supplementalOxygen' => false,
            'spo2Scale' => 'scale1',
        ])
            ->assertCreated()
            ->assertJsonPath('reading.news2.total', 0)
            ->assertJsonPath('alertActivated', false)
            ->assertJsonPath('nextControlAt', '2026-09-21T22:00:00+00:00');

        $this->assertDatabaseCount('vital_sign_readings', 1);
        $this->assertDatabaseCount('clinical_alerts', 0);
        $this->assertDatabaseHas('monitoring_schedules', [
            'encounter_id' => 'ENC-HOSP-0001',
            'frequency_minutes' => 720,
        ]);
        Carbon::setTestNow();
    }

    public function test_vitals_with_news2_at_least_one_activate_alert_process(): void
    {
        $this->inpatientEncounter();
        $this->asRole('auxiliar_enfermeria');

        $this->postJson('/api/v1/inpatient-care/encounters/ENC-HOSP-0001/vital-signs', [
            'respiratoryRate' => 25,
            'oxygenSaturation' => 98,
            'systolicBloodPressure' => 120,
            'pulse' => 72,
            'temperature' => 36.8,
            'consciousness' => 'alert',
            'supplementalOxygen' => false,
            'spo2Scale' => 'scale1',
        ])
            ->assertCreated()
            ->assertJsonPath('alertActivated', true);

        $this->assertGreaterThanOrEqual(1, ClinicalAlert::query()->where('encounter_id', 'ENC-HOSP-0001')->count());
        $this->assertSame(0, MonitoringSchedule::query()->where('encounter_id', 'ENC-HOSP-0001')->count());
    }

    public function test_telemetry_applies_butterworth_and_stores_filtered_reading(): void
    {
        $this->inpatientEncounter();
        $this->asRole('enfermera_piso');

        $samples = [];
        for ($i = 0; $i < 32; $i++) {
            $samples[] = [
                'pulse' => 70 + (($i % 2) * 8),
                'oxygenSaturation' => 97,
                'respiratoryRate' => 16,
                'systolicBloodPressure' => 118,
                'temperature' => 36.7,
            ];
        }

        $this->postJson('/api/v1/inpatient-care/encounters/ENC-HOSP-0001/vital-signs/telemetry', [
            'samples' => $samples,
            'consciousness' => 'alert',
            'supplementalOxygen' => false,
            'spo2Scale' => 'scale1',
        ])
            ->assertCreated()
            ->assertJsonPath('filtered', true)
            ->assertJsonStructure(['reading' => ['pulse', 'news2']]);

        $this->assertDatabaseCount('vital_sign_readings', 1);
    }

    public function test_chart_returns_evolutionary_series(): void
    {
        $this->inpatientEncounter();
        VitalSignReading::query()->create([
            'encounter_id' => 'ENC-HOSP-0001',
            'rr' => 16,
            'spo2' => 98,
            'sbp' => 120,
            'pulse' => 72,
            'temperature' => 36.8,
            'news2_total' => 0,
            'recorded_at' => '2026-09-21 08:00:00',
        ]);
        VitalSignReading::query()->create([
            'encounter_id' => 'ENC-HOSP-0001',
            'rr' => 18,
            'spo2' => 97,
            'sbp' => 118,
            'pulse' => 80,
            'temperature' => 37.0,
            'news2_total' => 0,
            'recorded_at' => '2026-09-21 12:00:00',
        ]);

        $this->asRole('enfermera_piso');
        $this->getJson('/api/v1/inpatient-care/encounters/ENC-HOSP-0001/vital-signs/chart')
            ->assertOk()
            ->assertJsonCount(2, 'series')
            ->assertJsonPath('series.1.pulse', 80);
    }
}
