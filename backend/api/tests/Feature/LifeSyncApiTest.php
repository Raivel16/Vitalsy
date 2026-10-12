<?php

namespace Tests\Feature;

use App\Models\LifeAccount;
use App\Models\LifeConsent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LifeSyncApiTest extends TestCase
{
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

        $this->postJson('/api/v1/life/sync', ['items' => [$item]])->assertOk()->assertJsonPath('accepted.0', 'bio-1');
        $this->postJson('/api/v1/life/sync', ['items' => [$item]])->assertOk()->assertJsonPath('accepted.0', 'bio-1');

        $this->assertDatabaseCount('life_biometric_samples', 1);
    }

    public function test_unknown_kind_and_out_of_range_values_are_rejected_not_stored(): void
    {
        $this->asCitizen();
        $bad = $this->bioItem('bio-2', [$this->sample('s2', 'spo2', 400, '%', 'manual')]);

        $this->postJson('/api/v1/life/sync', ['items' => [$bad]])
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

        $response = $this->postJson('/api/v1/life/sync', ['items' => $items])->assertOk();
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
        $this->postJson('/api/v1/life/sync', ['items' => [$item]])->assertOk();

        $this->asCitizen('dos@correo.pe');
        $this->postJson('/api/v1/life/sync', ['items' => [$item]])->assertOk()->assertJsonPath('accepted.0', 'bio-1');

        $this->assertDatabaseCount('life_biometric_samples', 2);
    }

    public function test_sync_requires_items_array(): void
    {
        $this->asCitizen();
        $this->postJson('/api/v1/life/sync', [])->assertStatus(422);
    }

    public function test_revoking_consent_closes_sharing(): void
    {
        $account = $this->asCitizen();
        $this->putJson('/api/v1/life/consent', ['sharingEnabled' => true])
            ->assertOk()->assertJsonPath('sharingEnabled', true)->assertJsonPath('revokedAt', null);
        $this->putJson('/api/v1/life/consent', ['sharingEnabled' => false])
            ->assertOk()->assertJsonPath('sharingEnabled', false)->assertJsonStructure(['revokedAt']);

        $this->assertDatabaseHas('life_consents', ['life_account_id' => $account->id, 'sharing_enabled' => false]);
        $this->assertNotNull(LifeConsent::query()->first()->revoked_at);
        $this->putJson('/api/v1/life/consent', ['sharingEnabled' => true])->assertOk()->assertJsonPath('revokedAt', null);
        $this->assertDatabaseCount('life_consents', 1);
    }

    public function test_consent_requires_boolean(): void
    {
        $this->asCitizen();
        $this->putJson('/api/v1/life/consent', [])->assertStatus(422);
        $this->putJson('/api/v1/life/consent', ['sharingEnabled' => 'quizas'])->assertStatus(422);
    }

    public function test_logout_revokes_only_current_token(): void
    {
        $account = LifeAccount::query()->create(['name' => 'Ana', 'email' => 'a@b.pe', 'password' => 'Clave-segura-9']);
        $current = $account->createToken('life', ['life'])->plainTextToken;
        $account->createToken('life', ['life']);

        $this->withToken($current)->postJson('/api/v1/life/auth/logout')->assertNoContent();

        $this->assertDatabaseCount('personal_access_tokens', 1);
    }

    public function test_token_without_life_ability_is_rejected(): void
    {
        $account = LifeAccount::query()->create(['name' => 'Ana', 'email' => 'a@b.pe', 'password' => 'Clave-segura-9']);
        Sanctum::actingAs($account, ['otra']);

        $this->putJson('/api/v1/life/consent', ['sharingEnabled' => true])->assertForbidden();
    }
}
