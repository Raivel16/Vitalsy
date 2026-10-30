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
 * RNF-05: en produccion el trafico completo es HTTPS (el TLS 1.3 lo termina el proxy inverso).
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
        // Cableado real de bootstrap/app.php (TRUSTED_PROXIES por defecto: rangos privados).
        Route::get('/__secure-probe', fn (Request $r) => response()->json([
            'secure' => $r->isSecure(),
            'host' => $r->getHost(),
        ]));

        $headers = ['HTTP_X_FORWARDED_PROTO' => 'https'];

        $this->withServerVariables($headers + ['REMOTE_ADDR' => '10.1.2.3'])
            ->getJson('http://localhost/__secure-probe')->assertJson(['secure' => true]);

        $this->withServerVariables($headers + ['REMOTE_ADDR' => '203.0.113.9'])
            ->getJson('http://localhost/__secure-probe')->assertJson(['secure' => false]);
    }

    public function test_forwarded_host_and_port_are_ignored_even_from_trusted_proxy(): void
    {
        Route::get('/__host-probe', fn (Request $r) => response()->json([
            'host' => $r->getHost(),
            'port' => $r->getPort(),
        ]));

        $this->withServerVariables([
            'REMOTE_ADDR' => '10.1.2.3',
            'HTTP_X_FORWARDED_HOST' => 'evil.example',
            'HTTP_X_FORWARDED_PORT' => '8443',
            'HTTP_X_FORWARDED_PROTO' => 'https',
        ])->getJson('http://localhost/__host-probe')
            ->assertJson(['host' => 'localhost'])
            ->assertJsonMissing(['port' => 8443]);
    }

    public function test_sanctum_stateful_domains_come_from_environment(): void
    {
        // env() lee de $_SERVER/$_ENV (putenv va desactivado en Laravel): se fijan las tres fuentes.
        $previous = [$_SERVER['SANCTUM_STATEFUL_DOMAINS'] ?? null, $_ENV['SANCTUM_STATEFUL_DOMAINS'] ?? null];
        putenv('SANCTUM_STATEFUL_DOMAINS=vitalsy.example.org');
        $_SERVER['SANCTUM_STATEFUL_DOMAINS'] = $_ENV['SANCTUM_STATEFUL_DOMAINS'] = 'vitalsy.example.org';
        try {
            $config = require config_path('sanctum.php');
        } finally {
            putenv('SANCTUM_STATEFUL_DOMAINS');
            foreach ([['_SERVER', 0], ['_ENV', 1]] as [$bag, $i]) {
                if ($previous[$i] === null) {
                    unset($GLOBALS[$bag]['SANCTUM_STATEFUL_DOMAINS']);
                } else {
                    $GLOBALS[$bag]['SANCTUM_STATEFUL_DOMAINS'] = $previous[$i];
                }
            }
        }

        $this->assertSame(['vitalsy.example.org'], $config['stateful']);
    }

    public function test_default_trusted_proxies_are_private_ranges_not_wildcard(): void
    {
        $this->assertNotContains('*', TrustedProxies::fromEnv(null));
        $this->assertSame(['*'], TrustedProxies::fromEnv('*'));
        $this->assertSame(['10.0.0.1', '172.20.0.0/16'], TrustedProxies::fromEnv('10.0.0.1, 172.20.0.0/16'));
    }
}
