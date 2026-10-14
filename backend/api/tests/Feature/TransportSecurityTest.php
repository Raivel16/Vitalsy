<?php

namespace Tests\Feature;

use App\Providers\AppServiceProvider;
use App\Support\TrustedProxies;
use Illuminate\Http\Middleware\TrustProxies;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

/**
 * RNF-05: en produccion todo el trafico es HTTPS (el TLS 1.3 lo termina el proxy inverso).
 */
class TransportSecurityTest extends TestCase
{
    protected function tearDown(): void
    {
        TrustProxies::flushState();
        parent::tearDown();
    }

    public function test_production_forces_https_urls(): void
    {
        $this->app['env'] = 'production';
        $this->app->getProvider(AppServiceProvider::class)->boot();

        $this->assertStringStartsWith('https://', URL::to('/x'));
    }

    public function test_session_cookie_is_secure_by_default_in_production(): void
    {
        $previous = $_SERVER['APP_ENV'] ?? null;
        $_SERVER['APP_ENV'] = $_ENV['APP_ENV'] = 'production';
        putenv('APP_ENV=production');
        putenv('SESSION_SECURE_COOKIE');
        unset($_ENV['SESSION_SECURE_COOKIE'], $_SERVER['SESSION_SECURE_COOKIE']);

        try {
            $config = require config_path('session.php');
        } finally {
            $_SERVER['APP_ENV'] = $_ENV['APP_ENV'] = $previous ?? 'testing';
            putenv('APP_ENV='.($previous ?? 'testing'));
        }

        $this->assertTrue($config['secure']);
        $this->assertSame('lax', $config['same_site']);
        $this->assertTrue($config['http_only']);
    }

    public function test_forwarded_proto_is_honored_only_from_trusted_proxy(): void
    {
        TrustProxies::at(['10.0.0.0/8']);
        Route::get('/__secure-probe', fn (Request $r) => response()->json(['secure' => $r->isSecure()]));

        $headers = ['HTTP_X_FORWARDED_PROTO' => 'https'];

        $this->withServerVariables($headers + ['REMOTE_ADDR' => '10.1.2.3'])
            ->getJson('http://localhost/__secure-probe')->assertJson(['secure' => true]);

        $this->withServerVariables($headers + ['REMOTE_ADDR' => '203.0.113.9'])
            ->getJson('http://localhost/__secure-probe')->assertJson(['secure' => false]);
    }

    public function test_default_trusted_proxies_are_private_ranges_not_wildcard(): void
    {
        $this->assertNotContains('*', TrustedProxies::fromEnv(null));
        $this->assertSame(['*'], TrustedProxies::fromEnv('*'));
        $this->assertSame(['10.0.0.1', '172.20.0.0/16'], TrustedProxies::fromEnv('10.0.0.1, 172.20.0.0/16'));
    }
}
