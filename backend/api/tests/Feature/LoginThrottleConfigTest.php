<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LoginThrottleConfigTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->disableCookieEncryption();
        $this->withHeader('origin', 'http://localhost');
        $this->withHeader('referer', 'http://localhost');
        $this->get('/sanctum/csrf-cookie');
        $this->withHeader('X-CSRF-TOKEN', csrf_token());
    }

    /**
     * @return list<int>
     */
    private function failedAttempts(int $count): array
    {
        $statuses = [];
        for ($i = 0; $i < $count; $i++) {
            $statuses[] = $this->postJson('/api/v1/auth/login', [
                'email' => 'nadie@vitalsy.local',
                'password' => 'incorrecta123',
            ])->status();
        }

        return $statuses;
    }

    public function test_login_is_limited_to_ten_attempts_per_minute_by_default(): void
    {
        $statuses = $this->failedAttempts(11);

        $this->assertSame(array_fill(0, 10, 422), array_slice($statuses, 0, 10));
        $this->assertSame(429, $statuses[10]);
    }

    public function test_login_limit_follows_configuration(): void
    {
        config(['vitalsy.auth.login_throttle_per_minute' => 50]);

        $this->assertNotContains(429, $this->failedAttempts(11));
    }
}
