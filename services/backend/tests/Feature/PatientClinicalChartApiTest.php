<?php

namespace Tests\Feature;

use App\Models\AdmissionEncounter;
use App\Models\CareActivityCompletion;
use App\Models\LabResult;
use App\Models\MedicalEvolutionNote;
use App\Models\User;
use App\Models\VitalSignReading;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class PatientClinicalChartApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_clinical_roles_can_read_inpatient_clinical_chart(): void
    {
        AdmissionEncounter::query()->create([
            'encounter_id' => 'ENC-HOSP-0001',
            'order_number' => 'OI-2026-CHART-1',
            'source' => 'manual',
            'patient_name' => 'Paciente Chart Demo',
            'document_type' => 'DNI',
            'document_number' => '11223344',
            'origin_service' => 'Medicina',
            'coverage_payer' => 'Essalud',
            'coverage_status' => 'aprobada',
            'coverage_plan' => 'Regular',
            'room' => '401',
            'bed' => 'A',
            'service' => 'Medicina',
            'wristband_code' => 'BRZ-CHART-0001',
            'record_id' => 'EXP-CHART-0001',
            'current_step' => 'cerrado',
            'deliverables' => [],
            'clinical_payload' => [
                'assessment' => [
                    'chiefComplaint' => 'Disnea de dos días',
                    'allergies' => ['Penicilina'],
                    'history' => 'HTA',
                ],
                'vitals' => [
                    'summary' => 'FR 16, SpO2 98 %',
                    'news2Label' => '0 puntos, riesgo bajo',
                ],
                'medicalOrders' => [
                    'statusLabel' => 'Firmado',
                    'items' => ['Reposo relativo'],
                ],
            ],
        ]);

        $author = User::factory()->create(['role' => 'medico_residente', 'name' => 'Dra. Evolución']);
        VitalSignReading::query()->create([
            'encounter_id' => 'ENC-HOSP-0001',
            'rr' => 16,
            'spo2' => 98,
            'sbp' => 120,
            'pulse' => 72,
            'temperature' => 36.8,
            'spo2_scale' => 'scale1',
            'supplemental_oxygen' => false,
            'consciousness' => 'alert',
            'news2_total' => 0,
            'recorded_at' => now(),
        ]);
        LabResult::query()->create([
            'encounter_id' => 'ENC-HOSP-0001',
            'external_id' => 'LAB-1',
            'summary' => 'Hemograma normal',
            'resulted_at' => now(),
            'payload' => [],
        ]);
        MedicalEvolutionNote::query()->create([
            'encounter_id' => 'ENC-HOSP-0001',
            'author_user_id' => $author->id,
            'body' => 'Evolución favorable.',
            'signed_at' => now(),
        ]);

        $user = User::factory()->create(['role' => 'medico_tratante']);
        $this->actingAs($user);

        $this->getJson('/api/v1/inpatient-care/encounters/ENC-HOSP-0001/clinical-chart')
            ->assertOk()
            ->assertJsonPath('encounter.patientName', 'Paciente Chart Demo')
            ->assertJsonPath('admission.assessment.chiefComplaint', 'Disnea de dos días')
            ->assertJsonPath('vitalSigns.0.news2', 0)
            ->assertJsonPath('labResults.0.summary', 'Hemograma normal')
            ->assertJsonPath('medicalEvolutionNotes.0.body', 'Evolución favorable.');
    }

    public function test_admission_role_cannot_read_clinical_chart(): void
    {
        AdmissionEncounter::query()->create([
            'encounter_id' => 'ENC-HOSP-0001',
            'order_number' => 'OI-2026-CHART-2',
            'source' => 'manual',
            'patient_name' => 'Paciente Chart Demo',
            'document_type' => 'DNI',
            'document_number' => '11223344',
            'origin_service' => 'Medicina',
            'coverage_payer' => 'Essalud',
            'coverage_status' => 'aprobada',
            'coverage_plan' => 'Regular',
            'current_step' => 'cerrado',
            'deliverables' => [],
            'clinical_payload' => [],
        ]);

        $user = User::factory()->create(['role' => 'admision']);
        $this->actingAs($user);

        $this->getJson('/api/v1/inpatient-care/encounters/ENC-HOSP-0001/clinical-chart')
            ->assertForbidden();
    }

    public function test_clinical_chart_includes_care_activities_and_date_filter(): void
    {
        Carbon::setTestNow('2026-09-25 12:00:00');

        AdmissionEncounter::query()->create([
            'encounter_id' => 'ENC-HOSP-0001',
            'order_number' => 'OI-2026-CHART-3',
            'source' => 'manual',
            'patient_name' => 'Paciente Chart Demo',
            'document_type' => 'DNI',
            'document_number' => '11223344',
            'origin_service' => 'Medicina',
            'coverage_payer' => 'Essalud',
            'coverage_status' => 'aprobada',
            'coverage_plan' => 'Regular',
            'current_step' => 'cerrado',
            'deliverables' => [],
            'clinical_payload' => [],
        ]);

        $auxiliar = User::factory()->create(['role' => 'auxiliar_enfermeria', 'name' => 'Auxiliar Demo']);
        CareActivityCompletion::query()->create([
            'encounter_id' => 'ENC-HOSP-0001',
            'activity_label' => 'Higiene matutina',
            'completed_at' => Carbon::parse('2026-09-24 09:00:00'),
            'completed_by' => $auxiliar->id,
        ]);
        CareActivityCompletion::query()->create([
            'encounter_id' => 'ENC-HOSP-0001',
            'activity_label' => 'Alimentación asistida',
            'completed_at' => Carbon::parse('2026-09-10 09:00:00'),
            'completed_by' => $auxiliar->id,
        ]);
        VitalSignReading::query()->create([
            'encounter_id' => 'ENC-HOSP-0001',
            'rr' => 18,
            'spo2' => 97,
            'sbp' => 118,
            'pulse' => 80,
            'temperature' => 36.9,
            'spo2_scale' => 'scale1',
            'supplemental_oxygen' => false,
            'consciousness' => 'alert',
            'news2_total' => 1,
            'recorded_at' => Carbon::parse('2026-09-10 08:00:00'),
        ]);

        $user = User::factory()->create(['role' => 'medico_tratante']);
        $this->actingAs($user);

        $this->getJson('/api/v1/inpatient-care/encounters/ENC-HOSP-0001/clinical-chart')
            ->assertOk()
            ->assertJsonPath('careActivities.0.activityLabel', 'Higiene matutina')
            ->assertJsonPath('careActivities.0.completedByName', 'Auxiliar Demo')
            ->assertJsonCount(2, 'careActivities');

        $this->getJson('/api/v1/inpatient-care/encounters/ENC-HOSP-0001/clinical-chart?from=2026-09-20&to=2026-09-25')
            ->assertOk()
            ->assertJsonCount(1, 'careActivities')
            ->assertJsonPath('careActivities.0.activityLabel', 'Higiene matutina')
            ->assertJsonCount(0, 'vitalSigns');

        Carbon::setTestNow();
    }
}
