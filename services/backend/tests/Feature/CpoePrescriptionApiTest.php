<?php

namespace Tests\Feature;

use App\Models\AdmissionEncounter;
use App\Models\Prescription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CpoePrescriptionApiTest extends TestCase
{
    use RefreshDatabase;

    private function inpatientEncounter(string $encounterId = 'ENC-HOSP-0001'): AdmissionEncounter
    {
        return AdmissionEncounter::query()->create([
            'encounter_id' => $encounterId,
            'order_number' => 'OI-2026-CPOE-1',
            'source' => 'manual',
            'transfer_order_number' => 'OT-2026-CPOE-1',
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
            'wristband_code' => 'BRZ-CPOE-0001',
            'record_id' => 'EXP-CPOE-0001',
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

    public function test_tratante_can_create_cpoe_prescription_and_refresh_kardex(): void
    {
        $this->inpatientEncounter();
        $this->asRole('medico_tratante');

        $this->postJson('/api/v1/inpatient-care/encounters/ENC-HOSP-0001/prescriptions', [
            'continuePlan' => false,
            'items' => [
                [
                    'drugName' => 'Paracetamol',
                    'dose' => '1 g',
                    'route' => 'VO',
                    'frequency' => 'cada 8 horas',
                ],
                [
                    'drugName' => 'Omeprazol',
                    'dose' => '20 mg',
                    'route' => 'VO',
                    'frequency' => 'cada 24 horas',
                ],
            ],
        ])
            ->assertCreated()
            ->assertJsonPath('prescription.status', 'activo')
            ->assertJsonCount(2, 'prescription.items')
            ->assertJsonPath('kardex.medications.0', 'Paracetamol 1 g cada 8 horas')
            ->assertJsonPath('kardex.medications.1', 'Omeprazol 20 mg cada 24 horas');

        $this->assertDatabaseCount('prescriptions', 1);
        $this->assertDatabaseCount('prescription_items', 2);

        $this->getJson('/api/v1/inpatient-care/encounters/ENC-HOSP-0001/prescriptions/active')
            ->assertOk()
            ->assertJsonPath('prescription.items.0.drugName', 'Paracetamol');

        $this->getJson('/api/v1/inpatient-care/encounters/ENC-HOSP-0001/kardex')
            ->assertOk()
            ->assertJsonPath('medications.0', 'Paracetamol 1 g cada 8 horas');
    }

    public function test_continue_plan_keeps_previous_items_when_requested(): void
    {
        $this->inpatientEncounter();
        $prescriber = User::factory()->create(['role' => 'medico_tratante']);
        $previous = Prescription::query()->create([
            'encounter_id' => 'ENC-HOSP-0001',
            'status' => 'activo',
            'prescribed_by' => $prescriber->id,
            'signed_at' => now(),
        ]);
        $previous->items()->create([
            'drug_name' => 'Amoxicilina',
            'dose' => '500 mg',
            'route' => 'VO',
            'frequency' => 'cada 8 horas',
        ]);

        $this->actingAs($prescriber)
            ->postJson('/api/v1/inpatient-care/encounters/ENC-HOSP-0001/prescriptions', [
                'continuePlan' => true,
                'items' => [
                    [
                        'drugName' => 'Enoxaparina',
                        'dose' => '40 mg',
                        'route' => 'SC',
                        'frequency' => 'cada 24 horas',
                    ],
                ],
            ])
            ->assertCreated()
            ->assertJsonCount(2, 'prescription.items')
            ->assertJsonPath('prescription.items.0.drugName', 'Amoxicilina')
            ->assertJsonPath('prescription.items.1.drugName', 'Enoxaparina');

        $this->assertSame('reemplazado', $previous->fresh()->status);
    }

    public function test_resident_cannot_manage_cpoe(): void
    {
        $this->inpatientEncounter();
        $this->asRole('medico_residente');

        $this->postJson('/api/v1/inpatient-care/encounters/ENC-HOSP-0001/prescriptions', [
            'items' => [
                ['drugName' => 'X', 'dose' => '1', 'route' => 'VO', 'frequency' => 'c/24h'],
            ],
        ])
            ->assertForbidden()
            ->assertJsonPath('message', 'No tiene permiso para esta acción.');
    }

    public function test_items_are_required_in_spanish(): void
    {
        $this->inpatientEncounter();
        $this->asRole('medico_tratante');

        $this->postJson('/api/v1/inpatient-care/encounters/ENC-HOSP-0001/prescriptions', [
            'items' => [],
        ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Debe indicar al menos un medicamento en la prescripción.');
    }
}
