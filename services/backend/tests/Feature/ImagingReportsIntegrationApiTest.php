<?php

namespace Tests\Feature;

use App\Models\AdmissionEncounter;
use App\Models\ImagingReport;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ImagingReportsIntegrationApiTest extends TestCase
{
    use RefreshDatabase;

    private function inpatientEncounter(string $encounterId = 'ENC-HOSP-0001'): AdmissionEncounter
    {
        return AdmissionEncounter::query()->create([
            'encounter_id' => $encounterId,
            'order_number' => 'OI-2026-IMG-1',
            'source' => 'manual',
            'transfer_order_number' => 'OT-2026-IMG-1',
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
            'wristband_code' => 'BRZ-IMG-0001',
            'record_id' => 'EXP-IMG-0001',
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

    public function test_system_sync_integrates_pacs_imaging_reports_for_an_encounter(): void
    {
        $this->inpatientEncounter();
        $this->asRole('medico_tratante');

        $this->postJson('/api/v1/inpatient-care/encounters/ENC-HOSP-0001/imaging-reports/sync')
            ->assertOk()
            ->assertJsonPath('integrated', 2)
            ->assertJsonPath('reports.0.externalId', 'PACS-DR-2001')
            ->assertJsonPath('reports.0.modality', 'RX')
            ->assertJsonPath('reports.0.summary', 'Radiografía de tórax: sin consolidaciones')
            ->assertJsonPath('reports.1.externalId', 'PACS-DR-2002');

        $this->assertDatabaseCount('imaging_reports', 2);
        $stored = ImagingReport::query()->where('external_id', 'PACS-DR-2001')->first();
        $this->assertNotNull($stored);
        $this->assertSame('fhir.DiagnosticReport', $stored->payload['resourceType'] ?? null);
    }

    public function test_sync_is_idempotent_for_the_same_pacs_external_ids(): void
    {
        $this->inpatientEncounter();
        $this->asRole('medico_residente');

        $this->postJson('/api/v1/inpatient-care/encounters/ENC-HOSP-0001/imaging-reports/sync')->assertOk();
        $this->postJson('/api/v1/inpatient-care/encounters/ENC-HOSP-0001/imaging-reports/sync')
            ->assertOk()
            ->assertJsonPath('integrated', 2);

        $this->assertDatabaseCount('imaging_reports', 2);
    }

    public function test_clinicians_can_list_integrated_imaging_reports(): void
    {
        $this->inpatientEncounter();
        $this->asRole('medico_residente');
        $this->postJson('/api/v1/inpatient-care/encounters/ENC-HOSP-0001/imaging-reports/sync')->assertOk();

        $this->getJson('/api/v1/inpatient-care/encounters/ENC-HOSP-0001/imaging-reports')
            ->assertOk()
            ->assertJsonCount(2, 'reports')
            ->assertJsonPath('reports.0.externalId', 'PACS-DR-2001');
    }

    public function test_unknown_encounter_returns_spanish_not_found(): void
    {
        $this->asRole('medico_residente');

        $this->postJson('/api/v1/inpatient-care/encounters/ENC-NO-EXISTE/imaging-reports/sync')
            ->assertNotFound()
            ->assertJsonPath('message', 'No se encontró el ingreso.');
    }

    public function test_admission_role_cannot_sync_imaging_reports(): void
    {
        $this->inpatientEncounter();
        $this->asRole('admision');

        $this->postJson('/api/v1/inpatient-care/encounters/ENC-HOSP-0001/imaging-reports/sync')
            ->assertForbidden()
            ->assertJsonPath('message', 'No tiene permiso para esta acción.');
    }
}
