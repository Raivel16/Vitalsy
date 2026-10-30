<?php

namespace Tests\Feature;

use App\Models\AdmissionEncounter;
use App\Models\LifeAccount;
use App\Models\LifeBaselineImport;
use App\Models\LifeBiometricSample;
use App\Models\LifeConsent;
use App\Models\LifeLinkCode;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LifeAdmissionLinkApiTest extends TestCase
{
    private const V_1_LIFE_BASELINE = '/api/v1/hospital-admission/encounters/ENC-LIFE-1/life-baseline';

    private const ADMISSION_LIFE_LINKS = '/api/v1/hospital-admission/life-links';

    use RefreshDatabase;

    private function asRole(string $role): static
    {
        return $this->actingAs(User::factory()->create(['role' => $role]));
    }

    private function encounter(string $id): AdmissionEncounter
    {
        return AdmissionEncounter::query()->create([
            'encounter_id' => $id,
            'order_number' => 'OI-'.$id,
            'source' => 'manual',
            'patient_name' => 'Paciente Life Demo',
            'document_type' => 'DNI',
            'document_number' => '11223344',
            'origin_service' => 'Medicina',
            'coverage_payer' => 'Essalud',
            'coverage_status' => 'aprobada',
            'coverage_plan' => 'Regular',
            'current_step' => 'indicaciones',
            'deliverables' => [],
            'clinical_payload' => [],
        ]);
    }

    /** @return array{0: LifeAccount, 1: string} */
    private function citizenWithCodeAndHistory(): array
    {
        $account = LifeAccount::query()->create(['name' => 'Ana', 'email' => 'ana@correo.pe', 'password' => 'Clave-segura-9']);
        LifeConsent::query()->create(['life_account_id' => $account->id, 'sharing_enabled' => true]);
        for ($day = 1; $day <= 10; $day++) {
            for ($n = 0; $n < 2; $n++) {
                LifeBiometricSample::query()->create([
                    'life_account_id' => $account->id,
                    'client_id' => "hr-$day-$n",
                    'kind' => 'heart_rate',
                    'value' => 60 + $day + $n,
                    'unit' => 'bpm',
                    'started_at' => now()->subDays($day)->subMinutes($n),
                    'ended_at' => now()->subDays($day)->subMinutes($n),
                    'origin' => 'health_connect',
                ]);
            }
        }
        LifeLinkCode::query()->create([
            'life_account_id' => $account->id,
            'code' => 'VL-ABCD-2345',
            'expires_at' => now()->addMinutes(30),
        ]);

        return [$account, 'VL-ABCD-2345'];
    }

    public function test_admission_imports_baseline_with_valid_code(): void
    {
        [, $code] = $this->citizenWithCodeAndHistory();
        $this->encounter('ENC-LIFE-1');
        $this->asRole('admision');

        $this->postJson(self::ADMISSION_LIFE_LINKS, ['encounterId' => 'ENC-LIFE-1', 'code' => $code])
            ->assertCreated()
            ->assertJsonPath('link.status', 'importada')
            ->assertJsonMissingPath('link.accountName')
            ->assertJsonMissingPath('link.email');

        $this->assertNotNull(LifeLinkCode::query()->first()->consumed_at);
        $this->assertSame('ENC-LIFE-1', LifeLinkCode::query()->first()->consumed_encounter_id);

        $this->asRole('enfermera_piso');
        $this->getJson(self::V_1_LIFE_BASELINE)
            ->assertOk()->assertJsonPath('baseline.metrics.0.kind', 'heart_rate');
    }

    public function test_only_samples_inside_the_baseline_window_are_loaded(): void
    {
        [$account, $code] = $this->citizenWithCodeAndHistory();
        LifeBiometricSample::query()->create([
            'life_account_id' => $account->id, 'client_id' => 'old', 'kind' => 'heart_rate', 'value' => 50,
            'unit' => 'bpm', 'started_at' => now()->subDays(90), 'ended_at' => now()->subDays(90), 'origin' => 'health_connect',
        ]);
        $this->encounter('ENC-LIFE-1');
        $this->asRole('admision');

        DB::enableQueryLog();
        $this->postJson(self::ADMISSION_LIFE_LINKS, ['encounterId' => 'ENC-LIFE-1', 'code' => $code])->assertCreated();

        $selects = collect(DB::getQueryLog())->filter(fn ($q) => str_starts_with($q['query'], 'select') && str_contains($q['query'], 'life_biometric_samples'));
        $this->assertTrue($selects->contains(fn ($q) => str_contains($q['query'], 'started_at')), 'La consulta de muestras debe acotar la ventana por started_at.');
    }

    public function test_baseline_is_null_when_nothing_imported(): void
    {
        $this->encounter('ENC-LIFE-1');
        $this->asRole('medico_tratante');
        $this->getJson(self::V_1_LIFE_BASELINE)
            ->assertOk()->assertJsonPath('baseline', null);
    }

    public function test_consumed_or_unknown_code_is_rejected(): void
    {
        [, $code] = $this->citizenWithCodeAndHistory();
        $this->encounter('ENC-LIFE-1');
        $this->encounter('ENC-LIFE-2');
        $this->asRole('admision');
        $this->postJson(self::ADMISSION_LIFE_LINKS, ['encounterId' => 'ENC-LIFE-1', 'code' => $code])->assertCreated();

        $this->postJson(self::ADMISSION_LIFE_LINKS, ['encounterId' => 'ENC-LIFE-2', 'code' => $code])
            ->assertStatus(422)->assertJsonPath('code', 'code_consumed');

        $this->postJson(self::ADMISSION_LIFE_LINKS, ['encounterId' => 'ENC-LIFE-2', 'code' => 'VL-ZZZZ-ZZZZ'])
            ->assertStatus(422)->assertJsonPath('code', 'code_not_found');
    }

    public function test_expired_code_is_rejected_with_code_expired(): void
    {
        [, $code] = $this->citizenWithCodeAndHistory();
        $this->encounter('ENC-LIFE-1');
        $this->asRole('admision');
        $this->travel(31)->minutes();

        $this->postJson(self::ADMISSION_LIFE_LINKS, ['encounterId' => 'ENC-LIFE-1', 'code' => $code])
            ->assertStatus(422)->assertJsonPath('code', 'code_expired');
        $this->assertDatabaseCount('life_baseline_imports', 0);
    }

    public function test_revoked_sharing_blocks_import(): void
    {
        [$account, $code] = $this->citizenWithCodeAndHistory();
        LifeConsent::query()->where('life_account_id', $account->id)
            ->update(['sharing_enabled' => false, 'revoked_at' => now()]);
        $this->encounter('ENC-LIFE-1');
        $this->asRole('admision');

        $this->postJson(self::ADMISSION_LIFE_LINKS, ['encounterId' => 'ENC-LIFE-1', 'code' => $code])
            ->assertStatus(422)->assertJsonPath('code', 'sharing_closed');
        $this->assertDatabaseCount('life_baseline_imports', 0);
        $this->assertNull(LifeLinkCode::query()->first()->consumed_at);
    }

    public function test_unknown_encounter_is_not_found_and_keeps_code_usable(): void
    {
        [, $code] = $this->citizenWithCodeAndHistory();
        $this->asRole('admision');

        $this->postJson(self::ADMISSION_LIFE_LINKS, ['encounterId' => 'ENC-NOPE', 'code' => $code])
            ->assertNotFound();
        $this->assertNull(LifeLinkCode::query()->first()->consumed_at);
    }

    public function test_encounter_can_only_be_linked_once(): void
    {
        [$account, $code] = $this->citizenWithCodeAndHistory();
        $this->encounter('ENC-LIFE-1');
        LifeLinkCode::query()->create([
            'life_account_id' => $account->id,
            'code' => 'VL-WXYZ-6789',
            'expires_at' => now()->addMinutes(30),
        ]);
        $this->asRole('admision');
        $this->postJson(self::ADMISSION_LIFE_LINKS, ['encounterId' => 'ENC-LIFE-1', 'code' => $code])->assertCreated();

        $this->postJson(self::ADMISSION_LIFE_LINKS, ['encounterId' => 'ENC-LIFE-1', 'code' => 'VL-WXYZ-6789'])
            ->assertStatus(422)->assertJsonPath('code', 'already_linked');
        $this->assertDatabaseCount('life_baseline_imports', 1);
        $this->assertNull(LifeLinkCode::query()->where('code', 'VL-WXYZ-6789')->first()->consumed_at);
    }

    public function test_citizen_token_cannot_use_hospital_routes(): void
    {
        [$account, $code] = $this->citizenWithCodeAndHistory();
        $this->encounter('ENC-LIFE-1');
        Sanctum::actingAs($account, ['life']);

        $this->postJson(self::ADMISSION_LIFE_LINKS, ['encounterId' => 'ENC-LIFE-1', 'code' => $code])
            ->assertForbidden();
        $this->getJson(self::V_1_LIFE_BASELINE)->assertForbidden();
    }

    public function test_baseline_is_readable_by_admission_and_clinical_roles(): void
    {
        $this->encounter('ENC-LIFE-1');
        foreach (['admision', 'medico_residente', 'medico_tratante', 'enfermera_piso'] as $role) {
            $this->asRole($role);
            $this->getJson(self::V_1_LIFE_BASELINE)->assertOk();
        }
    }

    public function test_import_records_acting_user(): void
    {
        [, $code] = $this->citizenWithCodeAndHistory();
        $this->encounter('ENC-LIFE-1');
        $user = User::factory()->create(['role' => 'admision']);
        $this->actingAs($user);

        $this->postJson(self::ADMISSION_LIFE_LINKS, ['encounterId' => 'ENC-LIFE-1', 'code' => $code])->assertCreated();

        $this->assertSame($user->id, LifeBaselineImport::query()->first()->imported_by);
    }

    public function test_unique_violation_maps_to_already_linked_without_consuming_code(): void
    {
        [$account, $code] = $this->citizenWithCodeAndHistory();
        $this->encounter('ENC-LIFE-1');
        $this->asRole('admision');
        // Simula la carrera: otro proceso inserta el import justo antes de nuestro INSERT.
        LifeBaselineImport::creating(function () use ($account) {
            DB::table('life_baseline_imports')->insert([
                'encounter_id' => 'ENC-LIFE-1',
                'life_account_id' => $account->id,
                'baseline' => '[]',
                'imported_at' => now(),
            ]);
        });

        $this->postJson(self::ADMISSION_LIFE_LINKS, ['encounterId' => 'ENC-LIFE-1', 'code' => $code])
            ->assertStatus(422)->assertJsonPath('code', 'already_linked');
        $this->assertNull(LifeLinkCode::query()->first()->consumed_at);
        // El INSERT simulado ocurre dentro de la misma transacción, que se revierte completa.
        $this->assertDatabaseCount('life_baseline_imports', 0);
    }

    public function test_roles_are_enforced(): void
    {
        [, $code] = $this->citizenWithCodeAndHistory();
        $this->encounter('ENC-LIFE-1');

        $this->asRole('enfermera_piso');
        $this->postJson(self::ADMISSION_LIFE_LINKS, ['encounterId' => 'ENC-LIFE-1', 'code' => $code])
            ->assertForbidden();

        $this->asRole('camillero');
        $this->getJson(self::V_1_LIFE_BASELINE)->assertForbidden();
    }

    public function test_link_requires_encounter_and_code(): void
    {
        $this->asRole('admision');
        $this->postJson(self::ADMISSION_LIFE_LINKS, [])->assertStatus(422);
    }
}
