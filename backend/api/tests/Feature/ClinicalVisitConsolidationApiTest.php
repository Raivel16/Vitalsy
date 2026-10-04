<?php

namespace Tests\Feature;

use App\Models\AdmissionEncounter;
use App\Models\ImagingReport;
use App\Models\LabResult;
use App\Models\NursingEvolutionNote;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class ClinicalVisitConsolidationApiTest extends TestCase
{
    use RefreshDatabase;

    private function inpatientEncounter(string $encounterId = 'ENC-HOSP-0001'): AdmissionEncounter
    {
        return AdmissionEncounter::query()->create([
            'encounter_id' => $encounterId,
            'order_number' => 'OI-2026-VIS-1',
            'source' => 'manual',
            'transfer_order_number' => 'OT-2026-VIS-1',
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
            'wristband_code' => 'BRZ-VIS-0001',
            'record_id' => 'EXP-VIS-0001',
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

    public function test_visit_board_consolidates_labs_imaging_and_nursing_notes_of_the_day(): void
    {
        Carbon::setTestNow('2026-09-21 12:00:00');
        $this->inpatientEncounter();
        $nurse = User::factory()->create(['role' => 'enfermera_piso']);

        LabResult::query()->create([
            'encounter_id' => 'ENC-HOSP-0001',
            'external_id' => 'LIS-OBS-1001',
            'summary' => 'Hemoglobina 11.2 g/dL',
            'payload' => ['resourceType' => 'fhir.Observation'],
            'resulted_at' => '2026-09-21 08:15:00',
        ]);
        ImagingReport::query()->create([
            'encounter_id' => 'ENC-HOSP-0001',
            'external_id' => 'PACS-DR-2001',
            'modality' => 'RX',
            'summary' => 'Radiografía de tórax: sin consolidaciones',
            'payload' => ['resourceType' => 'fhir.DiagnosticReport'],
            'reported_at' => '2026-09-21 09:00:00',
        ]);
        NursingEvolutionNote::query()->create([
            'encounter_id' => 'ENC-HOSP-0001',
            'author_user_id' => $nurse->id,
            'body' => 'Tolera medicación oral. Sin dolor.',
        ]);
        // Nota de otro día: no debe aparecer.
        $yesterday = NursingEvolutionNote::query()->create([
            'encounter_id' => 'ENC-HOSP-0001',
            'author_user_id' => $nurse->id,
            'body' => 'Nota de ayer',
        ]);
        NursingEvolutionNote::query()->whereKey($yesterday->id)->update([
            'created_at' => '2026-09-20 10:00:00',
            'updated_at' => '2026-09-20 10:00:00',
        ]);

        $this->asRole('medico_tratante');

        $this->getJson('/api/v1/inpatient-care/encounters/ENC-HOSP-0001/clinical-visit')
            ->assertOk()
            ->assertJsonPath('day', '2026-09-21')
            ->assertJsonCount(1, 'labResults')
            ->assertJsonCount(1, 'imagingReports')
            ->assertJsonCount(1, 'nursingNotes')
            ->assertJsonPath('labResults.0.summary', 'Hemoglobina 11.2 g/dL')
            ->assertJsonPath('imagingReports.0.summary', 'Radiografía de tórax: sin consolidaciones')
            ->assertJsonPath('nursingNotes.0.body', 'Tolera medicación oral. Sin dolor.');

        Carbon::setTestNow();
    }

    public function test_resident_can_open_clinical_visit_board(): void
    {
        $this->inpatientEncounter();
        $this->asRole('medico_residente');

        $this->getJson('/api/v1/inpatient-care/encounters/ENC-HOSP-0001/clinical-visit')
            ->assertOk()
            ->assertJsonPath('labResults', [])
            ->assertJsonPath('imagingReports', [])
            ->assertJsonPath('nursingNotes', []);
    }

    public function test_nurse_cannot_open_clinical_visit_board(): void
    {
        $this->inpatientEncounter();
        $this->asRole('enfermera_piso');

        $this->getJson('/api/v1/inpatient-care/encounters/ENC-HOSP-0001/clinical-visit')
            ->assertForbidden()
            ->assertJsonPath('message', 'No tiene permiso para esta acción.');
    }
}
