<?php

namespace Tests\Feature;

use App\Models\AdmissionEncounter;
use App\Models\Prescription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CpoePrescriptionApiTest extends TestCase
{
    private const CADA_24_HORAS = 'cada 24 horas';

    private const V_0001_PRESCRIPTIONS_ACTIVE = '/api/v1/inpatient-care/encounters/ENC-HOSP-0001/prescriptions/active';

    private const HOSP_0001_PRESCRIPTIONS = '/api/v1/inpatient-care/encounters/ENC-HOSP-0001/prescriptions';

    private const V_500_MG = '500 mg';

    private const CADA_8_HORAS = 'cada 8 horas';

    use RefreshDatabase;

    private function firstDose(): string
    {
        return now()->addHour()->toIso8601String();
    }

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

        $this->postJson(self::HOSP_0001_PRESCRIPTIONS, [
            'continuePlan' => false,
            'items' => [
                [
                    'drugName' => 'Paracetamol',
                    'dose' => '1 g',
                    'route' => 'VO',
                    'frequency' => self::CADA_8_HORAS,
                    'firstDoseAt' => $this->firstDose(),
                ],
                [
                    'drugName' => 'Omeprazol',
                    'dose' => '20 mg',
                    'route' => 'VO',
                    'frequency' => self::CADA_24_HORAS,
                    'firstDoseAt' => $this->firstDose(),
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

        $this->getJson(self::V_0001_PRESCRIPTIONS_ACTIVE)
            ->assertOk()
            ->assertJsonPath('prescription.items.0.drugName', 'Paracetamol')
            ->assertJsonPath('prescription.items.0.drugBarcode', 'DRUG-PARACETAMOL-1G');

        $this->getJson('/api/v1/inpatient-care/encounters/ENC-HOSP-0001/kardex')
            ->assertOk()
            ->assertJsonPath('medications.0', 'Paracetamol 1 g cada 8 horas');
    }

    public function test_floor_nurse_reads_the_active_prescription_without_the_drug_barcodes(): void
    {
        $this->inpatientEncounter();
        $this->asRole('medico_tratante');
        $this->postJson(self::HOSP_0001_PRESCRIPTIONS, [
            'items' => [['drugName' => 'Paracetamol', 'dose' => '1 g', 'route' => 'VO', 'frequency' => self::CADA_8_HORAS, 'firstDoseAt' => $this->firstDose()]],
        ])->assertCreated();

        $this->asRole('enfermera_piso');
        $response = $this->getJson(self::V_0001_PRESCRIPTIONS_ACTIVE)->assertOk();

        $response->assertJsonPath('prescription.items.0.drugName', 'Paracetamol');
        $this->assertArrayNotHasKey('drugBarcode', $response->json('prescription.items.0'));
        $this->assertStringNotContainsString('DRUG-PARACETAMOL-1G', $response->getContent());
    }

    public function test_tratante_can_edit_delete_and_add_items_individually(): void
    {
        $this->inpatientEncounter();
        $this->asRole('medico_tratante');

        $created = $this->postJson(self::HOSP_0001_PRESCRIPTIONS, [
            'items' => [
                ['drugName' => 'Paracetamol', 'dose' => '1 g', 'route' => 'VO', 'frequency' => self::CADA_8_HORAS, 'firstDoseAt' => $this->firstDose()],
                ['drugName' => 'Omeprazol', 'dose' => '20 mg', 'route' => 'VO', 'frequency' => self::CADA_24_HORAS, 'firstDoseAt' => $this->firstDose()],
            ],
        ])->assertCreated();

        $itemId = (int) $created->json('prescription.items.0.id');

        $this->putJson("/api/v1/inpatient-care/encounters/ENC-HOSP-0001/prescriptions/active/items/{$itemId}", [
            'drugName' => 'Paracetamol',
            'dose' => self::V_500_MG,
            'route' => 'VO',
            'frequency' => 'cada 6 horas',
            'firstDoseAt' => $this->firstDose(),
        ])
            ->assertOk()
            ->assertJsonPath('prescription.items.0.dose', self::V_500_MG)
            ->assertJsonPath('prescription.items.0.drugBarcode', 'DRUG-PARACETAMOL-500MG');

        $this->postJson('/api/v1/inpatient-care/encounters/ENC-HOSP-0001/prescriptions/active/items', [
            'drugName' => 'Enoxaparina',
            'dose' => '40 mg',
            'route' => 'SC',
            'frequency' => self::CADA_24_HORAS,
            'firstDoseAt' => $this->firstDose(),
        ])
            ->assertCreated()
            ->assertJsonCount(3, 'prescription.items');

        $active = $this->getJson(self::V_0001_PRESCRIPTIONS_ACTIVE)->json('prescription.items');
        $omeprazolId = (int) collect($active)->firstWhere('drugName', 'Omeprazol')['id'];

        $this->deleteJson("/api/v1/inpatient-care/encounters/ENC-HOSP-0001/prescriptions/active/items/{$omeprazolId}")
            ->assertOk()
            ->assertJsonCount(2, 'prescription.items');
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
            'dose' => self::V_500_MG,
            'route' => 'VO',
            'frequency' => self::CADA_8_HORAS,
        ]);

        $this->actingAs($prescriber)
            ->postJson(self::HOSP_0001_PRESCRIPTIONS, [
                'continuePlan' => true,
                'items' => [
                    [
                        'drugName' => 'Enoxaparina',
                        'dose' => '40 mg',
                        'route' => 'SC',
                        'frequency' => self::CADA_24_HORAS,
                        'firstDoseAt' => $this->firstDose(),
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

        $this->postJson(self::HOSP_0001_PRESCRIPTIONS, [
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

        $this->postJson(self::HOSP_0001_PRESCRIPTIONS, [
            'items' => [],
        ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Debe indicar al menos un medicamento en la prescripción.');
    }
}
