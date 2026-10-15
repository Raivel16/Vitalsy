<?php

namespace Tests\Feature;

use App\Http\Middleware\EnsureRequestOrigin;
use Illuminate\Http\Request;
use Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful;
use Tests\TestCase;

/**
 * Las pruebas de API saltan CSRF; aquí se verifica la causa del 419: si el middleware inyecta Origin,
 * Sanctum trata la solicitud como SPA con sesión y exige CSRF a clientes Bearer sin cookies.
 */
class RequestOriginStatefulTest extends TestCase
{
    private function stateful(Request $request): bool
    {
        (new EnsureRequestOrigin)->handle($request, fn () => response('ok'));

        return EnsureFrontendRequestsAreStateful::fromFrontend($request);
    }

    /** @param  array<string, string>  $headers */
    private function request(string $uri, array $headers = []): Request
    {
        $request = Request::create("http://localhost{$uri}", 'POST', server: ['HTTP_HOST' => 'localhost']);
        foreach ($headers as $name => $value) {
            $request->headers->set($name, $value);
        }

        return $request;
    }

    public function test_bearer_clients_never_become_stateful(): void
    {
        $this->assertFalse($this->stateful($this->request('/api/v1/life/sync', ['Authorization' => 'Bearer abc'])));
        $this->assertFalse($this->stateful($this->request('/api/v1/discharge/encounters/E/exit', ['Authorization' => 'Bearer abc'])));
    }

    public function test_life_namespace_without_bearer_is_not_stateful(): void
    {
        $this->assertFalse($this->stateful($this->request('/api/v1/life/auth/login')));
        $this->assertFalse($this->stateful($this->request('/api/v1/life/auth/register')));
    }

    public function test_web_session_requests_without_origin_still_get_origin(): void
    {
        $this->assertTrue($this->stateful($this->request('/api/v1/auth/login')));
    }
}
