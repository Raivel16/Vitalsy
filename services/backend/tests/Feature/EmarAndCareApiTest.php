<?php

namespace Tests\Feature;

use App\Models\AdmissionEncounter;
use App\Models\CareActivityCompletion;
use App\Models\MedicationAdministration;
use App\Models\NursingEvolutionNote;
use App\Models\Prescription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class EmarAndCareApiTest extends TestCase
{
    use RefreshDatabase;

    private function inpatientEncounter(string $encounterId = 'ENC-HOSP-0001'): AdmissionEncounter
    {
        return AdmissionEncounter::query()->create([
            'encounter_id' => $encounterId,
            'order_number' => 'OI-2026-EMAR-1',
            'source' => 'manual',
            'transfer_order_number' => 'OT-2026-EMAR-1',
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
            'wristband_code' => 'BRZ-EMAR-0001',
            'record_id' => 'EXP-EMAR-0001',
            'current_step' => 'cerrado',
            'waiting_reason' => null,
            'deliverables' => [],
            'clinical_payload' => [],
        ]);
    }

    private function seedDose(string $encounterId, User $prescriber): MedicationAdministration
    {
        $prescription = Prescription::query()->create([
            'encounter_id' => $encounterId,
            'status' => 'activo',
            'prescribed_by' => $prescriber->id,
            'signed_at' => now(),
        ]);
        $item = $prescription->items()->create([
            'drug_name' => 'Paracetamol',
            'dose' => '1 g',
            'route' => 'VO',
            'frequency' => 'cada 8 horas',
        ]);

        return MedicationAdministration::query()->create([
            'encounter_id' => $encounterId,
            'prescription_item_id' => $item->id,
            'scheduled_at' => Carbon::parse('2026-09-21 14:00:00'),
            'administered_at' => null,
            'status' => 'pendiente',
            'nurse_user_id' => null,
            'barcode_ok' => null,
        ]);
    }

    private function asRole(string $role): User
    {
        $user = User::factory()->create(['role' => $role]);
        $this->actingAs($user);

        return $user;
    }

    public function test_nurse_can_list_emar_doses_for_current_shift(): void
    {
        Carbon::setTestNow('2026-09-21 14:30:00');
        $this->inpatientEncounter();
        $prescriber = User::factory()->create(['role' => 'medico_tratante']);
        $this->seedDose('ENC-HOSP-0001', $prescriber);
        $this->asRole('enfermera_piso');

        $this->getJson('/api/v1/inpatient-care/encounters/ENC-HOSP-0001/emar')
            ->assertOk()
            ->assertJsonCount(1, 'doses')
            ->assertJsonPath('doses.0.drugName', 'Paracetamol')
            ->assertJsonPath('doses.0.status', 'pendiente');

        Carbon::setTestNow();
    }

    public function test_five_rights_block_on_mismatch_and_allow_signed_admin(): void
    {
        Carbon::setTestNow('2026-09-21 14:05:00');
        $this->inpatientEncounter();
        $prescriber = User::factory()->create(['role' => 'medico_tratante']);
        $dose = $this->seedDose('ENC-HOSP-0001', $prescriber);
        $this->asRole('enfermera_piso');

        $this->postJson("/api/v1/inpatient-care/encounters/ENC-HOSP-0001/emar/{$dose->id}/administer", [
            'patientBarcode' => 'BRZ-WRONG',
            'drugBarcode' => 'DRUG-PARACETAMOL-1G',
            'sign' => true,
        ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Los cinco correctos no coinciden. Administración bloqueada.');

        $this->assertSame('pendiente', $dose->fresh()->status);

        $this->postJson("/api/v1/inpatient-care/encounters/ENC-HOSP-0001/emar/{$dose->id}/administer", [
            'patientBarcode' => 'BRZ-EMAR-0001',
            'drugBarcode' => 'DRUG-PARACETAMOL-1G',
            'sign' => true,
        ])
            ->assertOk()
            ->assertJsonPath('dose.status', 'administrado')
            ->assertJsonPath('dose.barcodeOk', true);

        $this->assertNotNull($dose->fresh()->administered_at);
        Carbon::setTestNow();
    }

    public function test_nurse_can_register_evolution_note(): void
    {
        $this->inpatientEncounter();
        $this->asRole('enfermera_piso');

        $this->postJson('/api/v1/inpatient-care/encounters/ENC-HOSP-0001/nursing-evolution-notes', [
            'body' => 'Paciente estable. Tolera vía oral.',
        ])
            ->assertCreated()
            ->assertJsonPath('note.body', 'Paciente estable. Tolera vía oral.');

        $this->assertDatabaseCount('nursing_evolution_notes', 1);
    }

    public function test_auxiliar_can_complete_care_activity(): void
    {
        $this->inpatientEncounter();
        $this->asRole('auxiliar_enfermeria');

        $this->postJson('/api/v1/inpatient-care/encounters/ENC-HOSP-0001/care-activities', [
            'activityLabel' => 'Higiene matutina',
        ])
            ->assertCreated()
            ->assertJsonPath('activity.activityLabel', 'Higiene matutina');

        $this->assertDatabaseHas('care_activity_completions', [
            'encounter_id' => 'ENC-HOSP-0001',
            'activity_label' => 'Higiene matutina',
        ]);
    }
}
