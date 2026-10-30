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
    private const V_0001_INDICATION_RECEIPT = '/api/v1/discharge/encounters/ENC-ALTA-0001/indication-receipt';

    private const V_0001_NURSING_REPORT = '/api/v1/discharge/encounters/ENC-ALTA-0001/nursing-report';

    private const DISCHARGE_BOARD = '/api/v1/discharge/board';

    private const ANA_P_REZ = 'Familiar Ana Pérez';

    private const V_0001_EXIT_PASS = '/api/v1/discharge/encounters/ENC-ALTA-0001/exit-pass';

    private const ALTA_0001_RECONCILIATION = '/api/v1/discharge/encounters/ENC-ALTA-0001/reconciliation';

    private const C_8_H = 'c/8 h';

    private const ALTA_0001_ORDER = '/api/v1/discharge/encounters/ENC-ALTA-0001/order';

    private const ALTA_0001_PRESCRIPTIONS = '/api/v1/discharge/encounters/ENC-ALTA-0001/prescriptions';

    private const V_500_MG = '500 mg';

    private const ALTA_0001_EPICRISIS = '/api/v1/discharge/encounters/ENC-ALTA-0001/epicrisis';

    private const V_0001_SOCIAL_ASSESSMENT = '/api/v1/discharge/encounters/ENC-ALTA-0001/social-assessment';

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

        $this->postJson(self::ALTA_0001_ORDER)
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

        $this->postJson(self::ALTA_0001_ORDER)->assertStatus(422);
        $this->assertDatabaseMissing('discharge_orders', ['encounter_id' => 'ENC-ALTA-0001']);
    }

    public function test_order_notifies_social_work_on_the_board(): void
    {
        $this->inpatientEncounter();
        $this->asRole('medico_residente');
        $this->postJson(self::ALTA_0001_ORDER)->assertCreated();

        $this->asRole('trabajo_social');
        $this->getJson(self::DISCHARGE_BOARD)
            ->assertOk()
            ->assertJsonPath('cases.0.encounterId', 'ENC-ALTA-0001')
            ->assertJsonPath('cases.0.nextAction', 'social');
    }

    public function test_cannot_write_epicrisis_before_discharge_order(): void
    {
        $this->inpatientEncounter();
        $this->asRole('medico_residente');

        $this->postJson(self::ALTA_0001_EPICRISIS, [
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
        $this->postJson(self::ALTA_0001_ORDER)->assertCreated();
        $this->asRole('medico_residente');
        $this->postJson(self::ALTA_0001_EPICRISIS, [
            'diagnoses' => 'Neumonía', 'procedures' => 'Antibióticos', 'evolution' => 'Mejoría.',
        ])->assertCreated();
        $this->postJson(self::ALTA_0001_PRESCRIPTIONS, [
            'items' => [['drug' => 'Amoxicilina', 'dose' => self::V_500_MG, 'route' => 'VO', 'frequency' => self::C_8_H, 'days' => 5]],
        ])->assertCreated();
        $this->asRole('trabajo_social');
        $this->postJson(self::V_0001_SOCIAL_ASSESSMENT, [
            'report' => 'Red familiar adecuada.', 'validated' => true,
        ])->assertCreated();
        $this->asRole('enfermera_piso');
        $this->postJson(self::ALTA_0001_RECONCILIATION, ['notes' => 'Sin omisiones.'])->assertCreated();
        $this->postJson(self::V_0001_NURSING_REPORT, [
            'instructions' => 'Completar el antibiótico.', 'alarmSigns' => 'Fiebre.', 'homeCare' => 'Reposo.',
        ])->assertCreated();

        $url = self::V_0001_INDICATION_RECEIPT;
        $this->postJson($url, ['receivedByName' => self::ANA_P_REZ])->assertCreated();
        $this->postJson($url, ['receivedByName' => self::ANA_P_REZ])->assertCreated();
        $this->postJson($url, ['receivedByName' => 'Otra Persona'])
            ->assertStatus(422)
            ->assertJsonFragment(['message' => 'La recepción de indicaciones ya fue registrada y no puede modificarse.']);
        $this->assertSame(self::ANA_P_REZ, DischargeIndicationReceipt::query()->firstOrFail()->received_by_name);
    }

    public function test_parallel_social_and_nursing_then_exit_pass_and_physical_exit(): void
    {
        $this->inpatientEncounter();

        $this->asRole('medico_tratante');
        $this->postJson(self::ALTA_0001_ORDER)->assertCreated();

        $this->asRole('medico_residente');
        $this->postJson(self::ALTA_0001_EPICRISIS, [
            'diagnoses' => 'Neumonía comunitaria resuelta',
            'procedures' => 'Antibioticoterapia',
            'evolution' => 'Mejoría clínica y tolerancia oral.',
        ])->assertCreated();
        $this->postJson(self::ALTA_0001_PRESCRIPTIONS, [
            'items' => [
                ['drug' => 'Amoxicilina', 'dose' => self::V_500_MG, 'route' => 'VO', 'frequency' => self::C_8_H, 'days' => 5],
            ],
        ])->assertCreated();

        $this->asRole('trabajo_social');
        $this->postJson(self::V_0001_SOCIAL_ASSESSMENT, [
            'report' => 'Cuenta con red familiar y domicilio adecuado.',
            'validated' => true,
        ])->assertCreated();

        $this->asRole('enfermera_piso');
        $this->getJson('/api/v1/discharge/encounters/ENC-ALTA-0001/reconciliation-context')
            ->assertOk()
            ->assertJsonPath('epicrisis.diagnoses', 'Neumonía comunitaria resuelta')
            ->assertJsonCount(1, 'prescriptions.items');
        $this->postJson(self::ALTA_0001_RECONCILIATION, [
            'notes' => 'Sin omisiones ni duplicidades.',
        ])->assertCreated();
        $this->postJson(self::V_0001_NURSING_REPORT, [
            'instructions' => 'Completar el antibiótico.',
            'alarmSigns' => 'Fiebre o disnea.',
            'homeCare' => 'Reposo relativo e hidratación.',
        ])->assertCreated()
            ->assertJsonPath('case.nursingReport.homeCare', "Reposo relativo e hidratación.\nContinuidad social validada.");
        $this->postJson(self::V_0001_INDICATION_RECEIPT, [
            'receivedByName' => self::ANA_P_REZ,
        ])->assertCreated();

        $this->asRole('altas_caja');
        $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0001/account', [
            'status' => 'conforme',
        ])->assertCreated();
        $this->postJson(self::V_0001_EXIT_PASS)
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

        $this->getJson(self::DISCHARGE_BOARD)
            ->assertOk()
            ->assertJsonCount(0, 'cases');
    }

    public function test_cannot_issue_exit_pass_when_account_is_pending(): void
    {
        $this->inpatientEncounter();
        $this->asRole('medico_tratante');
        $this->postJson(self::ALTA_0001_ORDER)->assertCreated();
        $this->completeClinicalDischarge();

        $this->asRole('altas_caja');
        $this->postJson(self::V_0001_EXIT_PASS)
            ->assertStatus(422)
            ->assertJsonPath('message', 'La liquidación administrativa aún no está conforme.');
    }

    public function test_only_the_floor_nurse_can_confirm_the_exit(): void
    {
        $this->inpatientEncounter();
        $this->asRole('medico_tratante');
        $this->postJson(self::ALTA_0001_ORDER)->assertCreated();
        $this->completeClinicalDischarge();

        $this->asRole('altas_caja');
        $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0001/account', [
            'status' => 'conforme',
        ])->assertCreated();
        $this->postJson(self::V_0001_EXIT_PASS)->assertCreated();

        $this->asRole('camillero');
        $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0001/exit')
            ->assertForbidden();
    }

    public function test_cashier_cannot_open_medical_order(): void
    {
        $this->inpatientEncounter();
        $this->asRole('altas_caja');

        $this->postJson(self::ALTA_0001_ORDER)
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
        $this->getJson(self::DISCHARGE_BOARD)
            ->assertOk()
            ->assertJsonPath('cases.0.nextAction', 'reconciliation');
    }

    private function completeClinicalDischarge(): void
    {
        $this->asRole('medico_residente');
        $this->postJson(self::ALTA_0001_EPICRISIS, [
            'diagnoses' => 'Alta clínica',
            'procedures' => 'Ninguno',
            'evolution' => 'Estable',
        ])->assertCreated();
        $this->postJson(self::ALTA_0001_PRESCRIPTIONS, [
            'items' => [['drug' => 'Paracetamol', 'dose' => self::V_500_MG, 'route' => 'VO', 'frequency' => self::C_8_H, 'days' => 3]],
        ])->assertCreated();

        $this->asRole('trabajo_social');
        $this->postJson(self::V_0001_SOCIAL_ASSESSMENT, [
            'report' => 'Red de apoyo suficiente.',
            'validated' => true,
        ])->assertCreated();

        $this->asRole('enfermera_piso');
        $this->postJson(self::ALTA_0001_RECONCILIATION, [
            'notes' => 'Conciliación completa.',
        ])->assertCreated();
        $this->postJson(self::V_0001_NURSING_REPORT, [
            'instructions' => 'Tomar analgésico si hay dolor.',
            'alarmSigns' => 'Fiebre.',
            'homeCare' => 'Reposo.',
        ])->assertCreated();
        $this->postJson(self::V_0001_INDICATION_RECEIPT, [
            'receivedByName' => 'Familiar',
        ])->assertCreated();
    }
}
