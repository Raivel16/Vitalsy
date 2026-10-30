<?php

namespace Tests\Feature;

use App\Events\PatientExited;
use App\Models\AdmissionEncounter;
use App\Models\AmbulatoryPrescription;
use App\Models\LifeAccount;
use App\Models\LifeDischargePlan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LifeDischargePlanApiTest extends TestCase
{
    private const EXIT = '/exit';

    private const DISCHARGE_ENCOUNTERS = '/api/v1/discharge/encounters/';

    private const LIFE_PLAN = '/life-plan';

    use RefreshDatabase;

    private const ENC = 'ENC-ALTA-0001';

    private function inpatientEncounter(string $encounterId = self::ENC): AdmissionEncounter
    {
        return AdmissionEncounter::query()->create([
            'encounter_id' => $encounterId, 'order_number' => 'OI-'.$encounterId, 'source' => 'manual',
            'transfer_order_number' => 'OT-'.$encounterId, 'patient_name' => 'Paciente de Alta Demo',
            'document_type' => 'DNI', 'document_number' => '11223344', 'origin_service' => 'Medicina',
            'coverage_payer' => 'Essalud', 'coverage_status' => 'aprobada', 'coverage_plan' => 'Regular',
            'room' => '401', 'bed' => 'A', 'service' => 'Medicina', 'wristband_code' => 'BRZ-'.$encounterId,
            'record_id' => 'EXP-'.$encounterId, 'current_step' => 'cerrado', 'waiting_reason' => null,
            'deliverables' => [], 'clinical_payload' => [],
        ]);
    }

    private function asRole(string $role): User
    {
        $user = User::factory()->create(['role' => $role]);
        $this->actingAs($user);

        return $user;
    }

    private function asCitizen(string $email = 'ana@correo.pe'): LifeAccount
    {
        $account = LifeAccount::query()->create(['name' => 'Ana', 'email' => $email, 'password' => 'Clave-segura-9']);
        // Otro cliente: el test comparte sesión con la fase del personal, que invalidaría el token.
        $this->flushSession();
        Sanctum::actingAs($account, ['life']);

        return $account;
    }

    private function claim(string $code): TestResponse
    {
        $this->flushSession();

        return $this->getJson("/api/v1/life/discharge-plans/{$code}");
    }

    /** Receta con 1 ítem + conciliación + informe de enfermería. */
    private function dischargeReady(string $encounterId = self::ENC, bool $upToPass = false): void
    {
        $this->inpatientEncounter($encounterId);
        $base = "/api/v1/discharge/encounters/{$encounterId}";

        $this->asRole('medico_tratante');
        $this->postJson("{$base}/order")->assertCreated();
        $this->postJson("{$base}/prescriptions", [
            'items' => [['drug' => 'Amoxicilina', 'dose' => '500 mg', 'route' => 'VO', 'frequency' => 'c/8 h', 'days' => 5]],
        ])->assertCreated();

        $this->asRole('trabajo_social');
        $this->postJson("{$base}/social-assessment", ['report' => 'Red de apoyo suficiente.', 'validated' => true])->assertCreated();

        $this->asRole('enfermera_piso');
        $this->postJson("{$base}/reconciliation", ['notes' => 'Completa.'])->assertCreated();
        $this->postJson("{$base}/nursing-report", [
            'instructions' => 'Completar el antibiótico.',
            'alarmSigns' => "Fiebre persistente\nDificultad para respirar",
            'homeCare' => "Reposo relativo\nVitalsy Life: invitacion\nHidratación abundante",
        ])->assertCreated();

        if ($upToPass) {
            $this->postJson("{$base}/indication-receipt", ['receivedByName' => 'Familiar'])->assertCreated();
            $this->asRole('altas_caja');
            $this->postJson("{$base}/account", ['status' => 'conforme'])->assertCreated();
            $this->postJson("{$base}/exit-pass")->assertCreated();
            $this->asRole('enfermera_piso');
        }
    }

    private function issuedPlanCode(string $mode = 'usuario', bool $upToPass = false): string
    {
        $this->dischargeReady(self::ENC, $upToPass);
        $this->asRole('enfermera_piso');

        return (string) $this->postJson(self::DISCHARGE_ENCOUNTERS.self::ENC.self::LIFE_PLAN, ['mode' => $mode])
            ->assertCreated()
            ->json('lifePlan.code');
    }

    public function test_nurse_issues_structured_plan_from_prescriptions(): void
    {
        $this->dischargeReady();

        $this->postJson(self::DISCHARGE_ENCOUNTERS.self::ENC.self::LIFE_PLAN, ['mode' => 'invitacion'])
            ->assertCreated()
            ->assertJsonPath('lifePlan.mode', 'invitacion')
            ->assertJsonPath('lifePlan.status', 'pendiente')
            ->assertJsonPath('lifePlan.payload.medications.0.name', 'Amoxicilina')
            ->assertJsonPath('lifePlan.payload.medications.0.dose', '500 mg')
            ->assertJsonPath('lifePlan.payload.medications.0.schedule', '08:00')
            ->assertJsonPath('lifePlan.payload.comfortSigns', ['Fiebre persistente', 'Dificultad para respirar'])
            ->assertJsonPath('lifePlan.payload.homeCare', ['Reposo relativo', 'Hidratación abundante', 'Continuidad social validada.'])
            ->assertJsonPath('lifePlan.payload.validUntil', now()->addDays(30)->toDateString())
            ->assertJsonStructure(['lifePlan' => ['code', 'invitationCode']]);

        $plan = LifeDischargePlan::query()->firstOrFail();
        $this->assertMatchesRegularExpression('/^VLA-[A-HJ-NP-Z2-9]{8}$/', $plan->code);
        $this->assertMatchesRegularExpression('/^VLI-[A-HJ-NP-Z2-9]{8}$/', $plan->invitation_code);
        $this->assertSame($plan->code, $plan->payload['id']);
    }

    public function test_usuario_mode_has_no_invitation_code_and_reissue_keeps_codes(): void
    {
        $code = $this->issuedPlanCode('usuario');

        $this->postJson(self::DISCHARGE_ENCOUNTERS.self::ENC.self::LIFE_PLAN, ['mode' => 'usuario'])
            ->assertStatus(201)
            ->assertJsonPath('lifePlan.code', $code)
            ->assertJsonPath('lifePlan.invitationCode', null);

        $this->assertSame(1, LifeDischargePlan::query()->count());
    }

    public function test_rechaza_mode_is_persisted_without_codes_and_survives_reload(): void
    {
        $this->dischargeReady();

        $this->postJson(self::DISCHARGE_ENCOUNTERS.self::ENC.self::LIFE_PLAN, ['mode' => 'rechaza'])
            ->assertOk()
            ->assertJsonPath('lifePlan.mode', 'rechaza')
            ->assertJsonMissingPath('lifePlan.code');

        $plan = LifeDischargePlan::query()->firstOrFail();
        $this->assertSame('rechaza', $plan->mode);
        $this->assertNull($plan->code);
        $this->assertNull($plan->invitation_code);

        $this->getJson(self::DISCHARGE_ENCOUNTERS.self::ENC)
            ->assertOk()
            ->assertJsonPath('case.lifePlan.mode', 'rechaza')
            ->assertJsonMissingPath('case.lifePlan.code');

        // El paciente puede cambiar de decisión antes del egreso.
        $this->postJson(self::DISCHARGE_ENCOUNTERS.self::ENC.self::LIFE_PLAN, ['mode' => 'usuario'])
            ->assertCreated()
            ->assertJsonStructure(['lifePlan' => ['code']]);
    }

    public function test_exit_does_not_activate_a_rejected_plan(): void
    {
        $this->dischargeReady(self::ENC, true);
        $this->postJson(self::DISCHARGE_ENCOUNTERS.self::ENC.self::LIFE_PLAN, ['mode' => 'rechaza'])->assertOk();
        $this->postJson(self::DISCHARGE_ENCOUNTERS.self::ENC.self::EXIT)->assertCreated();

        $this->assertSame('rechazado', LifeDischargePlan::query()->firstOrFail()->status);
    }

    public function test_expired_plan_cannot_be_claimed(): void
    {
        $code = $this->issuedPlanCode('usuario');
        LifeDischargePlan::query()->update(['valid_until' => now()->subDay()->toDateString()]);

        $this->asCitizen();
        $this->claim($code)->assertStatus(410)->assertJsonPath('code', 'plan_expired');
        $this->assertNull(LifeDischargePlan::query()->firstOrFail()->claimed_by_account_id);
    }

    public function test_plan_without_medications_is_not_issued(): void
    {
        $this->dischargeReady();
        $rx = AmbulatoryPrescription::query()->where('encounter_id', self::ENC)->firstOrFail();
        $rx->update(['content' => ['items' => [['drug' => 'Amoxicilina', 'dose' => '']]]]);

        $this->postJson(self::DISCHARGE_ENCOUNTERS.self::ENC.self::LIFE_PLAN, ['mode' => 'usuario'])->assertStatus(422);
        $this->assertSame(0, LifeDischargePlan::query()->count());
    }

    public function test_plan_requires_prescription_and_reconciliation(): void
    {
        $this->inpatientEncounter('ENC-ALTA-0002');
        $this->asRole('enfermera_piso');

        $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0002/life-plan', ['mode' => 'usuario'])
            ->assertStatus(422);
    }

    public function test_plan_rejects_unknown_mode_and_other_roles(): void
    {
        $this->dischargeReady();
        $this->postJson(self::DISCHARGE_ENCOUNTERS.self::ENC.self::LIFE_PLAN, ['mode' => 'otro'])->assertStatus(422);

        $this->asRole('medico_tratante');
        $this->postJson(self::DISCHARGE_ENCOUNTERS.self::ENC.self::LIFE_PLAN, ['mode' => 'usuario'])->assertForbidden();
    }

    public function test_citizen_claims_plan_once_by_code_or_invitation(): void
    {
        $code = $this->issuedPlanCode('invitacion');
        $invitation = LifeDischargePlan::query()->firstOrFail()->invitation_code;

        $ana = $this->asCitizen();
        $this->claim($code)
            ->assertOk()
            ->assertJsonStructure(['id', 'medications', 'comfortSigns', 'homeCare', 'validUntil'])
            ->assertJsonPath('medications.0.name', 'Amoxicilina');

        $plan = LifeDischargePlan::query()->firstOrFail();
        $this->assertSame('reclamado', $plan->status);
        $this->assertSame($ana->id, $plan->claimed_by_account_id);

        // Misma cuenta: idempotente, también con el código de invitación.
        $this->claim($invitation)->assertOk();

        $this->asCitizen('otra@correo.pe');
        $this->claim($code)->assertStatus(409)->assertJsonPath('code', 'plan_claimed');
    }

    public function test_unknown_code_is_a_generic_404(): void
    {
        $this->asCitizen();
        $this->getJson('/api/v1/life/discharge-plans/VLA-NOEXISTE')->assertNotFound()->assertJsonPath('code', 'plan_not_found');
    }

    public function test_exit_transfers_custody_and_activates_plan(): void
    {
        $this->issuedPlanCode('usuario', true);
        $this->asRole('enfermera_piso');

        $this->postJson(self::DISCHARGE_ENCOUNTERS.self::ENC.self::EXIT)->assertCreated();

        $plan = LifeDischargePlan::query()->firstOrFail();
        $this->assertNotNull($plan->custody_transferred_at);
        $this->assertSame('activo', $plan->status);
    }

    public function test_exit_keeps_claimed_status_but_sets_custody(): void
    {
        $code = $this->issuedPlanCode('usuario', true);
        $this->asCitizen();
        $this->claim($code)->assertOk();

        $this->asRole('enfermera_piso');
        $this->postJson(self::DISCHARGE_ENCOUNTERS.self::ENC.self::EXIT)->assertCreated();

        $plan = LifeDischargePlan::query()->firstOrFail();
        $this->assertSame('reclamado', $plan->status);
        $this->assertNotNull($plan->custody_transferred_at);
    }

    public function test_both_listeners_are_registered_for_patient_exit(): void
    {
        // Descubrimiento automático de app/Listeners: exactamente un registro por listener.
        $this->assertCount(2, Event::getListeners(PatientExited::class));
    }

    public function test_plan_requires_discharge_order_first(): void
    {
        $this->inpatientEncounter('ENC-ALTA-0003');
        $this->asRole('enfermera_piso');

        $this->postJson('/api/v1/discharge/encounters/ENC-ALTA-0003/life-plan', ['mode' => 'usuario'])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Registre primero la orden digital de alta.');
    }

    public function test_other_roles_do_not_see_codes_or_payload_but_nurse_does(): void
    {
        $this->issuedPlanCode('invitacion');

        foreach (['medico_tratante', 'camillero', 'altas_caja', 'trabajo_social'] as $role) {
            $this->asRole($role);
            $plan = $this->getJson(self::DISCHARGE_ENCOUNTERS.self::ENC)->assertOk()->json('case.lifePlan');
            $this->assertSame('invitacion', $plan['mode']);
            $this->assertSame('pendiente', $plan['status']);
            $this->assertArrayNotHasKey('code', $plan);
            $this->assertArrayNotHasKey('invitationCode', $plan);
            $this->assertArrayNotHasKey('payload', $plan);
        }

        $this->asRole('enfermera_piso');
        $this->getJson(self::DISCHARGE_ENCOUNTERS.self::ENC)
            ->assertJsonStructure(['case' => ['lifePlan' => ['code', 'invitationCode', 'payload']]]);
    }

    public function test_cannot_reissue_after_exit(): void
    {
        $this->issuedPlanCode('usuario', true);
        $this->asRole('enfermera_piso');
        $this->postJson(self::DISCHARGE_ENCOUNTERS.self::ENC.self::EXIT)->assertCreated();

        $this->postJson(self::DISCHARGE_ENCOUNTERS.self::ENC.self::LIFE_PLAN, ['mode' => 'usuario'])
            ->assertStatus(422)
            ->assertJsonPath('message', 'El paciente ya egresó; el plan no puede reemitirse.');
    }

    public function test_switching_to_usuario_invalidates_issued_invitation_code(): void
    {
        $this->issuedPlanCode('invitacion');
        $invitation = LifeDischargePlan::query()->firstOrFail()->invitation_code;

        $this->postJson(self::DISCHARGE_ENCOUNTERS.self::ENC.self::LIFE_PLAN, ['mode' => 'usuario'])
            ->assertStatus(201)
            ->assertJsonPath('lifePlan.invitationCode', null);
        $this->assertNull(LifeDischargePlan::query()->firstOrFail()->invitation_code);

        $this->asCitizen();
        $this->claim($invitation)->assertNotFound()->assertJsonPath('code', 'plan_not_found');
    }

    public function test_case_presentation_includes_life_plan(): void
    {
        $this->dischargeReady();
        $this->getJson(self::DISCHARGE_ENCOUNTERS.self::ENC)->assertOk()->assertJsonPath('case.lifePlan', null);

        $this->postJson(self::DISCHARGE_ENCOUNTERS.self::ENC.self::LIFE_PLAN, ['mode' => 'usuario'])->assertCreated();
        $this->getJson(self::DISCHARGE_ENCOUNTERS.self::ENC)
            ->assertOk()
            ->assertJsonPath('case.lifePlan.mode', 'usuario')
            ->assertJsonStructure(['case' => ['lifePlan' => ['code', 'payload', 'status']]]);
    }
}
