<?php

namespace Tests\Feature;

use App\Models\AdmissionEncounter;
use App\Models\MedicalEvolutionNote;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MedicalEvolutionNoteApiTest extends TestCase
{
    private const MEDICAL_EVOLUTION_NOTES = '/api/v1/inpatient-care/encounters/ENC-HOSP-0001/medical-evolution-notes';

    private const CONTINUAR_PLAN_ACTUAL = 'Evolución favorable. Continuar plan actual.';

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

        $this->postJson(self::MEDICAL_EVOLUTION_NOTES, [
            'body' => self::CONTINUAR_PLAN_ACTUAL,
            'sign' => true,
        ])
            ->assertCreated()
            ->assertJsonPath('note.body', self::CONTINUAR_PLAN_ACTUAL)
            ->assertJsonPath('note.signed', true);

        // RNF-06: el cuerpo se almacena cifrado; se verifica por el modelo.
        $this->assertSame('ENC-HOSP-0001', MedicalEvolutionNote::query()->first()->encounter_id);
        $this->assertSame(self::CONTINUAR_PLAN_ACTUAL, MedicalEvolutionNote::query()->first()->body);
        $this->assertNotNull(MedicalEvolutionNote::query()->first()->signed_at);
    }

    public function test_body_is_required_in_spanish(): void
    {
        $this->inpatientEncounter();
        $this->asRole('medico_residente');

        $this->postJson(self::MEDICAL_EVOLUTION_NOTES, [])
            ->assertStatus(422)
            ->assertJsonPath('message', 'El campo nota de evolución es obligatorio.');
    }

    public function test_tratante_can_register_evolution_note(): void
    {
        $this->inpatientEncounter();
        $this->asRole('medico_tratante');

        $this->postJson(self::MEDICAL_EVOLUTION_NOTES, [
            'body' => 'Evolución clínica del paciente durante la visita.',
            'sign' => true,
        ])
            ->assertCreated()
            ->assertJsonPath('note.signed', true);
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
            ->getJson(self::MEDICAL_EVOLUTION_NOTES)
            ->assertOk()
            ->assertJsonCount(1, 'notes')
            ->assertJsonPath('notes.0.body', 'Nota previa');
    }
}
