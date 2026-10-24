<?php

namespace Tests\Feature;

use App\Models\AdmissionEncounter;
use App\Models\DischargeIndicationReceipt;
use App\Models\DischargeOrder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DischargeApiTest extends TestCase
{
    use RefreshDatabase;

    private function inpatientEncounter(string $encounterId = 'ENC-ALTA-0001'): AdmissionEncounter
    {
        return AdmissionEncounter::query()->create([
            'encounter_id' => $encounterId,
            'order_number' => 'OI-2026-ALTA-1',
            'source' => 'manual',
            'transfer_order_number' => 'OT-2026-ALTA-1',
            'patient_name' => 'Paciente de Alta Demo',
            'document_type' => 'DNI',
            'document_number' => '11223344',
            'origin_service' => 'Medicina',
            'coverage_payer' => 'Essalud',
            'coverage_status' => 'aprobada',
            'coverage_plan' => 'Regular',
            'room' => '401',
            'bed' => 'A',
            'service' => 'Medicina',
            'wristband_code' => 'BRZ-ALTA-0001',
            'record_id' => 'EXP-ALTA-0001',
            'current_step' => 'cerrado',
            'waiting_reason' => null,
            'deliverables' => [],
            'clinical_payload' => [],
        ]);
    }

    private function asRole(string $role): User
    {
        $user = User::factory()->create(['role' => $role]);
        $this->actingAs($user);

        return $user;
    }

    public function test_treating_physician_registers_discharge_order(): void
    {
        $this->inpatientEncounter();
        $this->asRole('medico_tratante');

        $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0001/order')
            ->assertCreated()
            ->assertJsonPath('case.order.status', 'registrada')
            ->assertJsonPath('case.patientName', 'Paciente de Alta Demo');

        $this->assertDatabaseHas('discharge_orders', [
            'encounter_id' => 'ENC-ALTA-0001',
            'status' => 'registrada',
        ]);
    }

    public function test_discharge_order_is_rejected_while_the_admission_is_still_open(): void
    {
        $this->inpatientEncounter()->update(['current_step' => 'orden']);
        $this->asRole('medico_tratante');

        $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0001/order')->assertStatus(422);
        $this->assertDatabaseMissing('discharge_orders', ['encounter_id' => 'ENC-ALTA-0001']);
    }

    public function test_order_notifies_social_work_on_the_board(): void
    {
        $this->inpatientEncounter();
        $this->asRole('medico_residente');
        $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0001/order')->assertCreated();

        $this->asRole('trabajo_social');
        $this->getJson('/api/v1/discharge/board')
            ->assertOk()
            ->assertJsonPath('cases.0.encounterId', 'ENC-ALTA-0001')
            ->assertJsonPath('cases.0.nextAction', 'social');
    }

    public function test_cannot_write_epicrisis_before_discharge_order(): void
    {
        $this->inpatientEncounter();
        $this->asRole('medico_residente');

        $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0001/epicrisis', [
            'diagnoses' => 'Neumonía resuelta',
            'procedures' => 'Oxigenoterapia',
            'evolution' => 'Estable para el alta',
        ])->assertStatus(422)
            ->assertJsonPath('message', 'Registre primero la orden digital de alta.');
    }

    public function test_indication_receipt_is_idempotent_but_rejects_different_content(): void
    {
        $this->inpatientEncounter();
        $this->asRole('medico_tratante');
        $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0001/order')->assertCreated();
        $this->asRole('medico_residente');
        $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0001/epicrisis', [
            'diagnoses' => 'Neumonía', 'procedures' => 'Antibióticos', 'evolution' => 'Mejoría.',
        ])->assertCreated();
        $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0001/prescriptions', [
            'items' => [['drug' => 'Amoxicilina', 'dose' => '500 mg', 'route' => 'VO', 'frequency' => 'c/8 h', 'days' => 5]],
        ])->assertCreated();
        $this->asRole('trabajo_social');
        $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0001/social-assessment', [
            'report' => 'Red familiar adecuada.', 'validated' => true,
        ])->assertCreated();
        $this->asRole('enfermera_piso');
        $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0001/reconciliation', ['notes' => 'Sin omisiones.'])->assertCreated();
        $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0001/nursing-report', [
            'instructions' => 'Completar el antibiótico.', 'alarmSigns' => 'Fiebre.', 'homeCare' => 'Reposo.',
        ])->assertCreated();

        $url = '/api/v1/discharge/encounters/ENC-ALTA-0001/indication-receipt';
        $this->postJson($url, ['receivedByName' => 'Familiar Ana Pérez'])->assertCreated();
        $this->postJson($url, ['receivedByName' => 'Familiar Ana Pérez'])->assertCreated();
        $this->postJson($url, ['receivedByName' => 'Otra Persona'])
            ->assertStatus(422)
            ->assertJsonFragment(['message' => 'La recepción de indicaciones ya fue registrada y no puede modificarse.']);
        $this->assertSame('Familiar Ana Pérez', DischargeIndicationReceipt::query()->firstOrFail()->received_by_name);
    }

    public function test_parallel_social_and_nursing_then_exit_pass_and_physical_exit(): void
    {
        $this->inpatientEncounter();

        $this->asRole('medico_tratante');
        $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0001/order')->assertCreated();

        $this->asRole('medico_residente');
        $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0001/epicrisis', [
            'diagnoses' => 'Neumonía comunitaria resuelta',
            'procedures' => 'Antibioticoterapia',
            'evolution' => 'Mejoría clínica y tolerancia oral.',
        ])->assertCreated();
        $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0001/prescriptions', [
            'items' => [
                ['drug' => 'Amoxicilina', 'dose' => '500 mg', 'route' => 'VO', 'frequency' => 'c/8 h', 'days' => 5],
            ],
        ])->assertCreated();

        $this->asRole('trabajo_social');
        $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0001/social-assessment', [
            'report' => 'Cuenta con red familiar y domicilio adecuado.',
            'validated' => true,
        ])->assertCreated();

        $this->asRole('enfermera_piso');
        $this->getJson('/api/v1/discharge/encounters/ENC-ALTA-0001/reconciliation-context')
            ->assertOk()
            ->assertJsonPath('epicrisis.diagnoses', 'Neumonía comunitaria resuelta')
            ->assertJsonCount(1, 'prescriptions.items');
        $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0001/reconciliation', [
            'notes' => 'Sin omisiones ni duplicidades.',
        ])->assertCreated();
        $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0001/nursing-report', [
            'instructions' => 'Completar el antibiótico.',
            'alarmSigns' => 'Fiebre o disnea.',
            'homeCare' => 'Reposo relativo e hidratación.',
        ])->assertCreated()
            ->assertJsonPath('case.nursingReport.homeCare', "Reposo relativo e hidratación.\nContinuidad social validada.");
        $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0001/indication-receipt', [
            'receivedByName' => 'Familiar Ana Pérez',
        ])->assertCreated();

        $this->asRole('altas_caja');
        $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0001/account', [
            'status' => 'conforme',
        ])->assertCreated();
        $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0001/exit-pass')
            ->assertCreated()
            ->assertJsonPath('case.exitPass.status', 'emitido');

        $this->asRole('camillero');
        $this->getJson('/api/v1/discharge/authorized-exits')
            ->assertOk()
            ->assertJsonPath('cases.0.encounterId', 'ENC-ALTA-0001');

        $this->asRole('enfermera_piso');
        $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0001/exit')
            ->assertCreated()
            ->assertJsonPath('case.exit.confirmed', true);

        $this->assertDatabaseHas('patient_exits', ['encounter_id' => 'ENC-ALTA-0001']);
        $this->assertSame('egresado', AdmissionEncounter::query()->where('encounter_id', 'ENC-ALTA-0001')->value('current_step'));

        $this->getJson('/api/v1/discharge/board')
            ->assertOk()
            ->assertJsonCount(0, 'cases');
    }

    public function test_cannot_issue_exit_pass_when_account_is_pending(): void
    {
        $this->inpatientEncounter();
        $this->asRole('medico_tratante');
        $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0001/order')->assertCreated();
        $this->completeClinicalDischarge();

        $this->asRole('altas_caja');
        $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0001/exit-pass')
            ->assertStatus(422)
            ->assertJsonPath('message', 'La liquidación administrativa aún no está conforme.');
    }

    public function test_only_the_floor_nurse_can_confirm_the_exit(): void
    {
        $this->inpatientEncounter();
        $this->asRole('medico_tratante');
        $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0001/order')->assertCreated();
        $this->completeClinicalDischarge();

        $this->asRole('altas_caja');
        $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0001/account', [
            'status' => 'conforme',
        ])->assertCreated();
        $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0001/exit-pass')->assertCreated();

        $this->asRole('camillero');
        $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0001/exit')
            ->assertForbidden();
    }

    public function test_cashier_cannot_open_medical_order(): void
    {
        $this->inpatientEncounter();
        $this->asRole('altas_caja');

        $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0001/order')
            ->assertForbidden();
    }

    public function test_board_lists_open_discharge_cases_for_nursing(): void
    {
        $this->inpatientEncounter();
        DischargeOrder::query()->create([
            'encounter_id' => 'ENC-ALTA-0001',
            'ordered_by' => User::factory()->create(['role' => 'medico_tratante'])->id,
            'ordered_at' => now(),
            'status' => 'registrada',
        ]);

        $this->asRole('enfermera_piso');
        $this->getJson('/api/v1/discharge/board')
            ->assertOk()
            ->assertJsonPath('cases.0.nextAction', 'reconciliation');
    }

    private function completeClinicalDischarge(): void
    {
        $this->asRole('medico_residente');
        $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0001/epicrisis', [
            'diagnoses' => 'Alta clínica',
            'procedures' => 'Ninguno',
            'evolution' => 'Estable',
        ])->assertCreated();
        $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0001/prescriptions', [
            'items' => [['drug' => 'Paracetamol', 'dose' => '500 mg', 'route' => 'VO', 'frequency' => 'c/8 h', 'days' => 3]],
        ])->assertCreated();

        $this->asRole('trabajo_social');
        $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0001/social-assessment', [
            'report' => 'Red de apoyo suficiente.',
            'validated' => true,
        ])->assertCreated();

        $this->asRole('enfermera_piso');
        $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0001/reconciliation', [
            'notes' => 'Conciliación completa.',
        ])->assertCreated();
        $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0001/nursing-report', [
            'instructions' => 'Tomar analgésico si hay dolor.',
            'alarmSigns' => 'Fiebre.',
            'homeCare' => 'Reposo.',
        ])->assertCreated();
        $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0001/indication-receipt', [
            'receivedByName' => 'Familiar',
        ])->assertCreated();
    }
}
