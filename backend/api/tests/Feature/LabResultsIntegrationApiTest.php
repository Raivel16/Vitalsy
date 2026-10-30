<?php

namespace Tests\Feature;

use App\Models\AdmissionEncounter;
use App\Models\LabResult;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LabResultsIntegrationApiTest extends TestCase
{
    private const LAB_RESULTS_SYNC = '/api/v1/inpatient-care/encounters/ENC-HOSP-0001/lab-results/sync';

    use RefreshDatabase;

    private function inpatientEncounter(string $encounterId = 'ENC-HOSP-0001'): AdmissionEncounter
    {
        return AdmissionEncounter::query()->create([
            'encounter_id' => $encounterId,
            'order_number' => 'OI-2026-LAB-1',
            'source' => 'manual',
            'transfer_order_number' => 'OT-2026-LAB-1',
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
            'wristband_code' => 'BRZ-LAB-0001',
            'record_id' => 'EXP-LAB-0001',
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

    public function test_system_sync_integrates_lis_lab_results_for_an_encounter(): void
    {
        $this->inpatientEncounter();
        $this->asRole('medico_residente');

        $this->postJson(self::LAB_RESULTS_SYNC)
            ->assertOk()
            ->assertJsonPath('integrated', 2)
            ->assertJsonPath('results.0.externalId', 'LIS-OBS-1001')
            ->assertJsonPath('results.0.summary', 'Hemoglobina 11.2 g/dL')
            ->assertJsonPath('results.1.externalId', 'LIS-OBS-1002');

        $this->assertDatabaseCount('lab_results', 2);
        $this->assertDatabaseHas('lab_results', [
            'encounter_id' => 'ENC-HOSP-0001',
            'external_id' => 'LIS-OBS-1001',
        ]);

        $stored = LabResult::query()->where('external_id', 'LIS-OBS-1001')->first();
        $this->assertNotNull($stored);
        $this->assertSame('fhir.Observation', $stored->payload['resourceType'] ?? null);
    }

    public function test_sync_is_idempotent_for_the_same_lis_external_ids(): void
    {
        $this->inpatientEncounter();
        $this->asRole('medico_tratante');

        $this->postJson(self::LAB_RESULTS_SYNC)->assertOk();
        $this->postJson(self::LAB_RESULTS_SYNC)
            ->assertOk()
            ->assertJsonPath('integrated', 2);

        $this->assertDatabaseCount('lab_results', 2);
    }

    public function test_clinicians_can_list_integrated_lab_results(): void
    {
        $this->inpatientEncounter();
        $this->asRole('medico_tratante');
        $this->postJson(self::LAB_RESULTS_SYNC)->assertOk();

        $this->getJson('/api/v1/inpatient-care/encounters/ENC-HOSP-0001/lab-results')
            ->assertOk()
            ->assertJsonCount(2, 'results')
            ->assertJsonPath('results.0.externalId', 'LIS-OBS-1001');
    }

    public function test_unknown_encounter_returns_spanish_not_found(): void
    {
        $this->asRole('medico_residente');

        $this->postJson('/api/v1/inpatient-care/encounters/ENC-NO-EXISTE/lab-results/sync')
            ->assertNotFound()
            ->assertJsonPath('message', 'No se encontró el ingreso.');
    }

    public function test_admission_role_cannot_sync_lab_results(): void
    {
        $this->inpatientEncounter();
        $this->asRole('admision');

        $this->postJson(self::LAB_RESULTS_SYNC)
            ->assertForbidden()
            ->assertJsonPath('message', 'No tiene permiso para esta acción.');
    }
}
