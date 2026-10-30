<?php

namespace Tests\Feature;

use App\Models\AdmissionEncounter;
use App\Models\MedicationAdministration;
use App\Models\Prescription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class EmarAndCareApiTest extends TestCase
{
    private const CADA_8_HORAS = 'cada 8 horas';

    private const HIGIENE_MATUTINA = 'Higiene matutina';

    private const HOSP_0001_EMAR = '/api/v1/inpatient-care/encounters/ENC-HOSP-0001/emar';

    private const V_0001_CARE_ACTIVITIES = '/api/v1/inpatient-care/encounters/ENC-HOSP-0001/care-activities';

    private const V_14_30_00 = '2026-09-21 14:30:00';

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
            'frequency' => self::CADA_8_HORAS,
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
        Carbon::setTestNow(self::V_14_30_00);
        $this->inpatientEncounter();
        $prescriber = User::factory()->create(['role' => 'medico_tratante']);
        $this->seedDose('ENC-HOSP-0001', $prescriber);
        $this->asRole('enfermera_piso');

        $this->getJson(self::HOSP_0001_EMAR)
            ->assertOk()
            ->assertJsonPath('hasActivePrescription', true)
            ->assertJsonFragment(['drugName' => 'Paracetamol', 'status' => 'pendiente']);

        Carbon::setTestNow();
    }

    public function test_emar_does_not_reveal_the_expected_barcodes(): void
    {
        Carbon::setTestNow(self::V_14_30_00);
        $this->inpatientEncounter();
        $prescriber = User::factory()->create(['role' => 'medico_tratante']);
        $this->seedDose('ENC-HOSP-0001', $prescriber);
        $this->asRole('enfermera_piso');

        $response = $this->getJson(self::HOSP_0001_EMAR)->assertOk();

        $this->assertStringNotContainsString('DRUG-PARACETAMOL-1G', $response->getContent());
        $this->assertStringNotContainsString('BRZ-EMAR-0001', $response->getContent());
        $this->assertArrayNotHasKey('expectedDrugBarcode', $response->json('doses.0'));
        $this->assertArrayNotHasKey('expectedPatientBarcode', $response->json('doses.0'));

        Carbon::setTestNow();
    }

    public function test_emar_codes_command_lists_the_codes_testers_need_to_scan(): void
    {
        Carbon::setTestNow(self::V_14_30_00);
        $this->inpatientEncounter();
        $this->seedDose('ENC-HOSP-0001', User::factory()->create(['role' => 'medico_tratante']));

        $this->artisan('emar:codes', ['encounter' => 'ENC-HOSP-0001'])
            ->expectsOutputToContain('BRZ-EMAR-0001')
            ->expectsOutputToContain('DRUG-PARACETAMOL-1G')
            ->assertExitCode(0);

        $this->artisan('emar:codes', ['encounter' => 'ENC-NO-EXISTE'])
            ->expectsOutputToContain('No se encontró el ingreso')
            ->assertExitCode(1);

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

    public function test_nurse_and_auxiliar_can_use_notes_and_care_activities(): void
    {
        $this->inpatientEncounter();

        $this->asRole('enfermera_piso');
        $this->postJson(self::V_0001_CARE_ACTIVITIES, [
            'activityLabel' => self::HIGIENE_MATUTINA,
        ])->assertCreated();

        $this->asRole('auxiliar_enfermeria');
        $this->postJson('/api/v1/inpatient-care/encounters/ENC-HOSP-0001/nursing-evolution-notes', [
            'body' => 'Auxiliar documenta evolución del turno.',
        ])->assertCreated();

        $this->assertDatabaseCount('care_activity_completions', 1);
        $this->assertDatabaseCount('nursing_evolution_notes', 1);
    }

    public function test_new_cpoe_schedules_doses_even_when_prior_doses_exist(): void
    {
        Carbon::setTestNow(self::V_14_30_00);
        $this->inpatientEncounter();
        $prescriber = User::factory()->create(['role' => 'medico_tratante']);

        $old = Prescription::query()->create([
            'encounter_id' => 'ENC-HOSP-0001',
            'status' => 'reemplazado',
            'prescribed_by' => $prescriber->id,
            'signed_at' => now()->subHour(),
        ]);
        $oldItem = $old->items()->create([
            'drug_name' => 'Ibuprofeno',
            'dose' => '400 mg',
            'route' => 'VO',
            'frequency' => self::CADA_8_HORAS,
        ]);
        MedicationAdministration::query()->create([
            'encounter_id' => 'ENC-HOSP-0001',
            'prescription_item_id' => $oldItem->id,
            'scheduled_at' => Carbon::parse('2026-09-21 08:00:00'),
            'status' => 'pendiente',
        ]);

        $active = Prescription::query()->create([
            'encounter_id' => 'ENC-HOSP-0001',
            'status' => 'activo',
            'prescribed_by' => $prescriber->id,
            'signed_at' => now(),
        ]);
        $active->items()->create([
            'drug_name' => 'Paracetamol',
            'dose' => '1 g',
            'route' => 'VO',
            'frequency' => self::CADA_8_HORAS,
        ]);

        $this->asRole('enfermera_piso');

        $response = $this->getJson(self::HOSP_0001_EMAR)
            ->assertOk()
            ->assertJsonPath('hasActivePrescription', true);

        $drugs = collect($response->json('doses'))->pluck('drugName')->all();
        $this->assertContains('Paracetamol', $drugs);
        $this->assertGreaterThanOrEqual(1, count($response->json('doses')));

        Carbon::setTestNow();
    }

    public function test_auxiliar_can_complete_care_activity(): void
    {
        $this->inpatientEncounter();
        $auxiliar = $this->asRole('auxiliar_enfermeria');

        $this->postJson(self::V_0001_CARE_ACTIVITIES, [
            'activityLabel' => self::HIGIENE_MATUTINA,
        ])
            ->assertCreated()
            ->assertJsonPath('activity.activityLabel', self::HIGIENE_MATUTINA)
            ->assertJsonPath('activity.completedByName', $auxiliar->name);

        $this->assertDatabaseHas('care_activity_completions', [
            'encounter_id' => 'ENC-HOSP-0001',
            'activity_label' => self::HIGIENE_MATUTINA,
            'completed_by' => $auxiliar->id,
        ]);

        $this->getJson(self::V_0001_CARE_ACTIVITIES)
            ->assertOk()
            ->assertJsonPath('activities.0.completedByName', $auxiliar->name);
    }

    public function test_el_turno_del_emar_sigue_la_zona_horaria_de_la_aplicacion(): void
    {
        $original = date_default_timezone_get();
        date_default_timezone_set('America/Lima');
        Carbon::setTestNow(Carbon::parse('2026-09-21 08:30:00', 'America/Lima'));

        try {
            $this->inpatientEncounter();
            $this->asRole('enfermera_piso');

            $this->getJson(self::HOSP_0001_EMAR)
                ->assertOk()
                ->assertJsonPath('shiftStart', '2026-09-21T07:00:00-05:00')
                ->assertJsonPath('shiftEnd', '2026-09-21T19:00:00-05:00');
        } finally {
            Carbon::setTestNow();
            date_default_timezone_set($original);
        }
    }
}
