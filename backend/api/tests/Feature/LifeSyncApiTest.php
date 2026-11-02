<?php

namespace Tests\Feature;

use App\Models\LifeAccount;
use App\Models\LifeBiometricSample;
use App\Models\LifeConsent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LifeSyncApiTest extends TestCase
{
    private const LIFE_SYNC = '/api/v1/life/sync';

    private const LIFE_CONSENT = '/api/v1/life/consent';

    use RefreshDatabase;

    private function asCitizen(string $email = 'ana@correo.pe'): LifeAccount
    {
        $account = LifeAccount::query()->create(['name' => 'Ana', 'email' => $email, 'password' => 'Clave-segura-9']);
        Sanctum::actingAs($account, ['life']);

        return $account;
    }

    private function bioItem(string $id, array $samples): array
    {
        return ['id' => $id, 'kind' => 'biometrics', 'status' => 'pending', 'body' => json_encode($samples)];
    }

    private function sample(string $id, string $kind, float|int $value, string $unit, string $origin = 'health_connect'): array
    {
        return [
            'id' => $id, 'kind' => $kind, 'value' => $value, 'unit' => $unit,
            'startedAt' => '2026-10-10T08:00:00Z', 'endedAt' => '2026-10-10T08:01:00Z', 'origin' => $origin,
        ];
    }

    public function test_resending_same_batch_is_idempotent(): void
    {
        $this->asCitizen();
        $item = $this->bioItem('bio-1', [$this->sample('s1', 'heart_rate', 72, 'bpm')]);

        $this->postJson(self::LIFE_SYNC, ['items' => [$item]])->assertOk()->assertJsonPath('accepted.0', 'bio-1');
        $this->postJson(self::LIFE_SYNC, ['items' => [$item]])->assertOk()->assertJsonPath('accepted.0', 'bio-1');

        $this->assertDatabaseCount('life_biometric_samples', 1);
    }

    public function test_vitalsy_band_origin_is_accepted(): void
    {
        $this->asCitizen();
        $item = $this->bioItem('bio-band', [
            $this->sample('vb:AA:heart_rate:1', 'heart_rate', 71, 'lpm', 'vitalsy_band'),
            $this->sample('vb:AA:spo2:1', 'spo2', 98, '%', 'vitalsy_band'),
        ]);

        $this->postJson(self::LIFE_SYNC, ['items' => [$item]])->assertOk()->assertJsonPath('accepted.0', 'bio-band');

        $this->assertDatabaseHas('life_biometric_samples', ['client_id' => 'vb:AA:spo2:1', 'origin' => 'vitalsy_band']);
    }

    public function test_unknown_origin_is_rejected(): void
    {
        $this->asCitizen();
        $item = $this->bioItem('bio-x', [$this->sample('s-x', 'heart_rate', 70, 'lpm', 'reloj_magico')]);

        $this->postJson(self::LIFE_SYNC, ['items' => [$item]])->assertOk()->assertJsonPath('rejected.0.id', 'bio-x');
        $this->assertDatabaseCount('life_biometric_samples', 0);
    }

    public function test_unknown_kind_and_out_of_range_values_are_rejected_not_stored(): void
    {
        $this->asCitizen();
        $bad = $this->bioItem('bio-2', [$this->sample('s2', 'spo2', 400, '%', 'manual')]);

        $this->postJson(self::LIFE_SYNC, ['items' => [$bad]])
            ->assertOk()->assertJsonPath('rejected.0.id', 'bio-2');
        $this->assertDatabaseCount('life_biometric_samples', 0);
    }

    public function test_malformed_body_and_unknown_item_kind_reject_only_that_item(): void
    {
        $this->asCitizen();
        $items = [
            ['id' => 'x1', 'kind' => 'biometrics', 'status' => 'pending', 'body' => '{no es json'],
            ['id' => 'x2', 'kind' => 'telepatia', 'status' => 'pending', 'body' => '[]'],
            ['id' => 'c1', 'kind' => 'consent', 'status' => 'pending', 'body' => '{}'],
            ['id' => 'p1', 'kind' => 'plan', 'status' => 'pending', 'body' => '{}'],
            $this->bioItem('bio-3', [$this->sample('s3', 'steps', 1200, 'count')]),
        ];

        $response = $this->postJson(self::LIFE_SYNC, ['items' => $items])->assertOk();
        $response->assertJsonPath('accepted', ['c1', 'p1', 'bio-3']);
        $response->assertJsonCount(2, 'rejected');
        $response->assertJsonPath('rejected.0.id', 'x1');
        $response->assertJsonPath('rejected.1.id', 'x2');
        $this->assertDatabaseCount('life_biometric_samples', 1);
    }

    public function test_samples_are_scoped_per_account(): void
    {
        $this->asCitizen('uno@correo.pe');
        $item = $this->bioItem('bio-1', [$this->sample('s1', 'heart_rate', 72, 'bpm')]);
        $this->postJson(self::LIFE_SYNC, ['items' => [$item]])->assertOk();

        $this->asCitizen('dos@correo.pe');
        $this->postJson(self::LIFE_SYNC, ['items' => [$item]])->assertOk()->assertJsonPath('accepted.0', 'bio-1');

        $this->assertDatabaseCount('life_biometric_samples', 2);
    }

    public function test_sync_requires_items_array(): void
    {
        $this->asCitizen();
        $this->postJson(self::LIFE_SYNC, [])->assertStatus(422);
    }

    public function test_revoking_consent_closes_sharing(): void
    {
        $account = $this->asCitizen();
        $this->putJson(self::LIFE_CONSENT, ['sharingEnabled' => true])
            ->assertOk()->assertJsonPath('sharingEnabled', true)->assertJsonPath('revokedAt', null);
        $this->putJson(self::LIFE_CONSENT, ['sharingEnabled' => false])
            ->assertOk()->assertJsonPath('sharingEnabled', false)->assertJsonStructure(['revokedAt']);

        $this->assertDatabaseHas('life_consents', ['life_account_id' => $account->id, 'sharing_enabled' => false]);
        $this->assertNotNull(LifeConsent::query()->first()->revoked_at);
        $this->putJson(self::LIFE_CONSENT, ['sharingEnabled' => true])->assertOk()->assertJsonPath('revokedAt', null);
        $this->assertDatabaseCount('life_consents', 1);
    }

    public function test_consent_requires_boolean(): void
    {
        $this->asCitizen();
        $this->putJson(self::LIFE_CONSENT, [])->assertStatus(422);
        $this->putJson(self::LIFE_CONSENT, ['sharingEnabled' => 'quizas'])->assertStatus(422);
    }

    public function test_logout_revokes_only_current_token(): void
    {
        $account = LifeAccount::query()->create(['name' => 'Ana', 'email' => 'a@b.pe', 'password' => 'Clave-segura-9']);
        $current = $account->createToken('life', ['life'])->plainTextToken;
        $account->createToken('life', ['life']);

        $this->withToken($current)->postJson('/api/v1/life/auth/logout')->assertNoContent();

        $this->assertDatabaseCount('personal_access_tokens', 1);
    }

    public function test_non_string_item_id_rejects_only_that_item(): void
    {
        $this->asCitizen();
        $items = [
            ['id' => [], 'kind' => 'plan', 'status' => 'pending', 'body' => '{}'],
            ['id' => ['a' => 1], 'kind' => 'biometrics', 'status' => 'pending', 'body' => '[]'],
            ['id' => 'p1', 'kind' => 'plan', 'status' => 'pending', 'body' => '{}'],
        ];

        $this->postJson(self::LIFE_SYNC, ['items' => $items])
            ->assertOk()
            ->assertJsonPath('accepted', ['p1'])
            ->assertJsonPath('rejected.0.id', '0')
            ->assertJsonPath('rejected.1.id', '1');
    }

    public function test_batch_over_200_items_is_a_validation_error(): void
    {
        $this->asCitizen();
        $items = array_map(fn ($i) => ['id' => "p$i", 'kind' => 'plan', 'status' => 'pending', 'body' => '{}'], range(1, 201));

        $this->postJson(self::LIFE_SYNC, ['items' => $items])->assertStatus(422);
    }

    public function test_end_before_start_is_rejected(): void
    {
        $this->asCitizen();
        $s = $this->sample('s1', 'heart_rate', 72, 'bpm');
        $s['endedAt'] = '2026-10-10T07:00:00Z';

        $this->postJson(self::LIFE_SYNC, ['items' => [$this->bioItem('b1', [$s])]])
            ->assertOk()->assertJsonPath('rejected.0.id', 'b1');
        $this->assertDatabaseCount('life_biometric_samples', 0);
    }

    public function test_relative_and_future_dates_are_rejected(): void
    {
        $this->asCitizen();
        $rel = $this->sample('s1', 'heart_rate', 72, 'bpm');
        $rel['startedAt'] = 'now';
        $rel['endedAt'] = 'tomorrow';
        $future = $this->sample('s2', 'heart_rate', 72, 'bpm');
        $future['startedAt'] = now()->addHour()->toIso8601String();
        $future['endedAt'] = now()->addHours(2)->toIso8601String();

        $this->postJson(self::LIFE_SYNC, ['items' => [
            $this->bioItem('b1', [$rel]),
            $this->bioItem('b2', [$future]),
        ]])->assertOk()->assertJsonCount(2, 'rejected')->assertJsonPath('accepted', []);
        $this->assertDatabaseCount('life_biometric_samples', 0);
    }

    public function test_item_with_one_invalid_sample_stores_nothing_from_it(): void
    {
        $this->asCitizen();
        $item = $this->bioItem('b1', [
            $this->sample('s1', 'heart_rate', 72, 'bpm'),
            $this->sample('s2', 'spo2', 400, '%'),
        ]);

        $this->postJson(self::LIFE_SYNC, ['items' => [$item]])->assertOk()->assertJsonPath('rejected.0.id', 'b1');
        $this->assertDatabaseCount('life_biometric_samples', 0);
    }

    public function test_numeric_string_value_is_rejected(): void
    {
        $this->asCitizen();
        $s = $this->sample('s1', 'heart_rate', 72, 'bpm');
        $s['value'] = '72';

        $this->postJson(self::LIFE_SYNC, ['items' => [$this->bioItem('b1', [$s])]])
            ->assertOk()->assertJsonPath('rejected.0.id', 'b1');
        $this->assertDatabaseCount('life_biometric_samples', 0);
    }

    public function test_oversized_item_is_rejected_alone(): void
    {
        $this->asCitizen();
        $many = array_fill(0, 501, $this->sample('s1', 'heart_rate', 72, 'bpm'));
        $items = [
            $this->bioItem('big', $many),
            ['id' => 'huge', 'kind' => 'biometrics', 'status' => 'pending', 'body' => str_repeat('a', 200001)],
            $this->bioItem('ok', [$this->sample('s9', 'heart_rate', 72, 'bpm')]),
        ];

        $this->postJson(self::LIFE_SYNC, ['items' => $items])
            ->assertOk()->assertJsonPath('accepted', ['ok'])->assertJsonCount(2, 'rejected');
    }

    public function test_client_id_collision_across_accounts_leaves_original_unchanged(): void
    {
        $a = $this->asCitizen('uno@correo.pe');
        $this->postJson(self::LIFE_SYNC, ['items' => [
            $this->bioItem('b1', [$this->sample('s1', 'heart_rate', 72, 'bpm')]),
        ]])->assertOk();

        $this->asCitizen('dos@correo.pe');
        $this->postJson(self::LIFE_SYNC, ['items' => [
            $this->bioItem('b1', [$this->sample('s1', 'heart_rate', 99, 'bpm')]),
        ]])->assertOk();

        $stored = LifeBiometricSample::query()->where('life_account_id', $a->id)->value('value');
        $this->assertSame(72.0, (float) $stored);
        $this->assertDatabaseCount('life_biometric_samples', 2);
    }

    public function test_revoking_twice_preserves_original_revoked_at(): void
    {
        $this->asCitizen();
        $this->putJson(self::LIFE_CONSENT, ['sharingEnabled' => true])->assertOk();
        $first = $this->putJson(self::LIFE_CONSENT, ['sharingEnabled' => false])->assertOk()->json('revokedAt');
        $this->travel(2)->hours();
        $second = $this->putJson(self::LIFE_CONSENT, ['sharingEnabled' => false])->assertOk()->json('revokedAt');

        $this->assertNotNull($first);
        $this->assertSame($first, $second);
    }

    public function test_token_without_life_ability_is_rejected(): void
    {
        $account = LifeAccount::query()->create(['name' => 'Ana', 'email' => 'a@b.pe', 'password' => 'Clave-segura-9']);
        Sanctum::actingAs($account, ['otra']);

        $this->putJson(self::LIFE_CONSENT, ['sharingEnabled' => true])->assertForbidden();
    }

    public function test_request_over_total_body_cap_is_rejected_whole(): void
    {
        $this->asCitizen();
        $items = [$this->bioItem('ok', [$this->sample('s1', 'heart_rate', 72, 'bpm')])];
        for ($i = 0; $i < 6; $i++) {
            $items[] = ['id' => "pad{$i}", 'kind' => 'plan', 'status' => 'pending', 'body' => str_repeat('a', 190000)];
        }

        $this->postJson(self::LIFE_SYNC, ['items' => $items])->assertStatus(422);
        $this->assertDatabaseCount('life_biometric_samples', 0);
    }

    public function test_request_over_total_sample_cap_is_rejected_whole(): void
    {
        $this->asCitizen();
        $items = [];
        for ($i = 0; $i < 5; $i++) {
            $samples = [];
            for ($j = 0; $j < 500; $j++) {
                $samples[] = $this->sample("s{$i}-{$j}", 'heart_rate', 72, 'bpm');
            }
            $items[] = $this->bioItem("item{$i}", $samples);
        }

        $this->postJson(self::LIFE_SYNC, ['items' => $items])->assertStatus(422);
        $this->assertDatabaseCount('life_biometric_samples', 0);
    }

    public function test_request_within_total_caps_still_works(): void
    {
        $this->asCitizen();
        $items = [];
        for ($i = 0; $i < 4; $i++) {
            $samples = [];
            for ($j = 0; $j < 500; $j++) {
                $samples[] = $this->sample("s{$i}-{$j}", 'heart_rate', 72, 'bpm');
            }
            $items[] = $this->bioItem("item{$i}", $samples);
        }

        $this->postJson(self::LIFE_SYNC, ['items' => $items])->assertOk()->assertJsonCount(4, 'accepted');
        $this->assertDatabaseCount('life_biometric_samples', 2000);
    }
}
