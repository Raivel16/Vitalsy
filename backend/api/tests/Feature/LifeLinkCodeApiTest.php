<?php

namespace Tests\Feature;

use App\Models\LifeAccount;
use App\Models\LifeLinkCode;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LifeLinkCodeApiTest extends TestCase
{
    use RefreshDatabase;

    private function asCitizen(string $email = 'ana@correo.pe'): LifeAccount
    {
        $account = LifeAccount::query()->create(['name' => 'Ana', 'email' => $email, 'password' => 'Clave-segura-9']);
        Sanctum::actingAs($account, ['life']);

        return $account;
    }

    public function test_link_code_requires_open_sharing(): void
    {
        $this->asCitizen();
        $this->postJson('/api/v1/life/link-codes')->assertStatus(409)->assertJsonPath('code', 'sharing_closed');
        $this->assertDatabaseCount('life_link_codes', 0);
    }

    public function test_link_code_has_expected_format_and_expiry(): void
    {
        $this->asCitizen();
        $this->putJson('/api/v1/life/consent', ['sharingEnabled' => true]);

        $response = $this->postJson('/api/v1/life/link-codes')->assertCreated()
            ->assertJsonPath('code', fn ($c) => preg_match('/^VL-[A-Z0-9]{4}-[A-Z0-9]{4}$/', $c) === 1);

        $expiresAt = Carbon::parse($response->json('expiresAt'));
        $this->assertEqualsWithDelta(30 * 60, now()->diffInSeconds($expiresAt, false), 5);
    }

    public function test_new_code_invalidates_previous_pending_ones_without_deleting(): void
    {
        $account = $this->asCitizen();
        $this->putJson('/api/v1/life/consent', ['sharingEnabled' => true]);

        $first = $this->postJson('/api/v1/life/link-codes')->assertCreated()->json('code');
        $second = $this->postJson('/api/v1/life/link-codes')->assertCreated()->json('code');

        $this->assertNotSame($first, $second);
        $this->assertDatabaseCount('life_link_codes', 2);
        $this->assertFalse(LifeLinkCode::query()->where('code', $first)->first()->isUsable());
        $this->assertTrue(LifeLinkCode::query()->where('code', $second)->first()->isUsable());
        $this->assertSame($account->id, LifeLinkCode::query()->where('code', $second)->first()->life_account_id);
    }

    public function test_consumed_code_is_not_usable(): void
    {
        $account = $this->asCitizen();
        $code = LifeLinkCode::query()->create([
            'life_account_id' => $account->id, 'code' => 'VL-AAAA-BBBB',
            'expires_at' => now()->addMinutes(10), 'consumed_at' => now(), 'consumed_encounter_id' => 'ING-1',
        ]);

        $this->assertFalse($code->isUsable());
    }

    public function test_revoking_consent_invalidates_pending_codes(): void
    {
        $this->asCitizen();
        $this->putJson('/api/v1/life/consent', ['sharingEnabled' => true]);
        $code = $this->postJson('/api/v1/life/link-codes')->json('code');

        $this->putJson('/api/v1/life/consent', ['sharingEnabled' => false])->assertOk();

        $this->assertFalse(LifeLinkCode::query()->where('code', $code)->first()->isUsable());
    }
}
