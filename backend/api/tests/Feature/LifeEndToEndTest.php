<?php

namespace Tests\Feature;

use App\Models\AdmissionEncounter;
use App\Models\LifeDischargePlan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * RF-89..RF-98: recorrido completo Clinical-Life.
 * Registro ciudadano -> consentimiento -> código -> admisión importa -> plan de alta ->
 * salida efectiva (custodia) -> el ciudadano reclama el plan.
 */
class LifeEndToEndTest extends TestCase
{
    use RefreshDatabase;

    private const ENC = 'ENC-E2E-0001';

    private function staff(string $role): void
    {
        $this->flushSession();
        $this->actingAs(User::factory()->create(['role' => $role]));
    }

    public function test_citizen_to_discharge_plan_claim_journey(): void
    {
        // 1. Registro ciudadano y consentimiento.
        $token = $this->postJson('/api/v1/life/auth/register', [
            'name' => 'Ana Rojas', 'email' => 'ana@correo.pe', 'password' => 'Clave-segura-9',
        ])->assertCreated()->json('token');
        $citizen = ['Authorization' => 'Bearer '.$token];

        $this->withHeaders($citizen)->putJson('/api/v1/life/consent', ['sharingEnabled' => true])->assertOk();

        // 2. Historial biométrico sincronizado y código de vinculación.
        $samples = [];
        for ($i = 1; $i <= 10; $i++) {
            $samples[] = [
                'id' => "hr-$i", 'kind' => 'heart_rate', 'value' => 60 + $i, 'unit' => 'bpm',
                'startedAt' => now()->subDays($i)->toIso8601String(),
                'endedAt' => now()->subDays($i)->addMinute()->toIso8601String(),
                'origin' => 'health_connect',
            ];
        }
        $this->withHeaders($citizen)->postJson('/api/v1/life/sync', ['items' => [
            ['id' => 'bio-1', 'kind' => 'biometrics', 'status' => 'pending', 'body' => json_encode($samples)],
        ]])->assertOk()->assertJsonPath('accepted.0', 'bio-1');

        $linkCode = $this->withHeaders($citizen)->postJson('/api/v1/life/link-codes')->assertCreated()->json('code');

        // 3. Admisión importa la línea base con el código.
        AdmissionEncounter::query()->create([
            'encounter_id' => self::ENC, 'order_number' => 'OI-'.self::ENC, 'source' => 'manual',
            'transfer_order_number' => 'OT-'.self::ENC, 'patient_name' => 'Ana Rojas',
            'document_type' => 'DNI', 'document_number' => '11223344', 'origin_service' => 'Medicina',
            'coverage_payer' => 'Essalud', 'coverage_status' => 'aprobada', 'coverage_plan' => 'Regular',
            'room' => '401', 'bed' => 'A', 'service' => 'Medicina', 'wristband_code' => 'BRZ-'.self::ENC,
            'record_id' => 'EXP-'.self::ENC, 'current_step' => 'cerrado', 'waiting_reason' => null,
            'deliverables' => [], 'clinical_payload' => [],
        ]);
        $this->staff('admision');
        $this->postJson('/api/v1/hospital-admission/life-links', ['encounterId' => self::ENC, 'code' => $linkCode])
            ->assertCreated()->assertJsonPath('link.status', 'importada');

        $this->staff('enfermera_piso');
        $this->getJson('/api/v1/hospital-admission/encounters/'.self::ENC.'/life-baseline')
            ->assertOk()->assertJsonPath('baseline.metrics.0.kind', 'heart_rate');

        // 4. Alta: orden, receta, social, conciliación, informe y plan Life.
        $base = '/api/v1/discharge/encounters/'.self::ENC;
        $this->staff('medico_tratante');
        $this->postJson("{$base}/order")->assertCreated();
        $this->postJson("{$base}/prescriptions", [
            'items' => [['drug' => 'Amoxicilina', 'dose' => '500 mg', 'route' => 'VO', 'frequency' => 'c/8 h', 'days' => 5]],
        ])->assertCreated();
        $this->staff('trabajo_social');
        $this->postJson("{$base}/social-assessment", ['report' => 'Red de apoyo suficiente.', 'validated' => true])->assertCreated();
        $this->staff('enfermera_piso');
        $this->postJson("{$base}/reconciliation", ['notes' => 'Completa.'])->assertCreated();
        $this->postJson("{$base}/nursing-report", [
            'instructions' => 'Completar el antibiótico.', 'alarmSigns' => 'Fiebre persistente', 'homeCare' => 'Reposo relativo',
        ])->assertCreated();
        $code = (string) $this->postJson("{$base}/life-plan", ['mode' => 'usuario'])
            ->assertCreated()->json('lifePlan.code');
        $this->postJson("{$base}/indication-receipt", ['receivedByName' => 'Familiar'])->assertCreated();
        $this->staff('altas_caja');
        $this->postJson("{$base}/account", ['status' => 'conforme'])->assertCreated();
        $this->postJson("{$base}/exit-pass")->assertCreated();

        // 5. Salida efectiva: transfiere la custodia y activa el plan.
        $this->staff('enfermera_piso');
        $this->postJson("{$base}/exit")->assertCreated();
        $plan = LifeDischargePlan::query()->firstOrFail();
        $this->assertNotNull($plan->custody_transferred_at);
        $this->assertSame('activo', $plan->status);

        // 6. El ciudadano reclama el plan con su propio token.
        $this->flushSession();
        $this->app['auth']->forgetGuards();
        $this->withHeaders($citizen)->getJson("/api/v1/life/discharge-plans/{$code}")
            ->assertOk()->assertJsonPath('medications.0.name', 'Amoxicilina');
        $this->assertSame('reclamado', $plan->fresh()->status);
    }
}
