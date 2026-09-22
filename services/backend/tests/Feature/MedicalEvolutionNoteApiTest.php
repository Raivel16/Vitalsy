<?php

namespace Tests\Feature;

use App\Models\AdmissionEncounter;
use App\Models\MedicalEvolutionNote;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MedicalEvolutionNoteApiTest extends TestCase
{
    use RefreshDatabase;

    private function inpatientEncounter(string $encounterId = 'ENC-HOSP-0001'): AdmissionEncounter
    {
        return AdmissionEncounter::query()->create([
            'encounter_id' => $encounterId,
            'order_number' => 'OI-2026-EVO-1',
            'source' => 'manual',
            'transfer_order_number' => 'OT-2026-EVO-1',
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
            'wristband_code' => 'BRZ-EVO-0001',
            'record_id' => 'EXP-EVO-0001',
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

    public function test_resident_can_register_and_sign_a_medical_evolution_note(): void
    {
        $this->inpatientEncounter();
        $this->asRole('medico_residente');

        $this->postJson('/api/v1/inpatient-care/encounters/ENC-HOSP-0001/medical-evolution-notes', [
            'body' => 'Evolución favorable. Continuar plan actual.',
            'sign' => true,
        ])
            ->assertCreated()
            ->assertJsonPath('note.body', 'Evolución favorable. Continuar plan actual.')
            ->assertJsonPath('note.signed', true);

        $this->assertDatabaseHas('medical_evolution_notes', [
            'encounter_id' => 'ENC-HOSP-0001',
            'body' => 'Evolución favorable. Continuar plan actual.',
        ]);
        $this->assertNotNull(MedicalEvolutionNote::query()->first()->signed_at);
    }

    public function test_body_is_required_in_spanish(): void
    {
        $this->inpatientEncounter();
        $this->asRole('medico_residente');

        $this->postJson('/api/v1/inpatient-care/encounters/ENC-HOSP-0001/medical-evolution-notes', [])
            ->assertStatus(422)
            ->assertJsonPath('message', 'El campo nota de evolución es obligatorio.');
    }

    public function test_tratante_cannot_register_evolution_note(): void
    {
        $this->inpatientEncounter();
        $this->asRole('medico_tratante');

        $this->postJson('/api/v1/inpatient-care/encounters/ENC-HOSP-0001/medical-evolution-notes', [
            'body' => 'No corresponde a este rol.',
            'sign' => true,
        ])
            ->assertForbidden()
            ->assertJsonPath('message', 'No tiene permiso para esta acción.');
    }

    public function test_resident_can_list_evolution_notes(): void
    {
        $this->inpatientEncounter();
        $resident = User::factory()->create(['role' => 'medico_residente']);
        MedicalEvolutionNote::query()->create([
            'encounter_id' => 'ENC-HOSP-0001',
            'author_user_id' => $resident->id,
            'body' => 'Nota previa',
            'signed_at' => now(),
        ]);

        $this->actingAs($resident)
            ->getJson('/api/v1/inpatient-care/encounters/ENC-HOSP-0001/medical-evolution-notes')
            ->assertOk()
            ->assertJsonCount(1, 'notes')
            ->assertJsonPath('notes.0.body', 'Nota previa');
    }
}
