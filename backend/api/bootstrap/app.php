<?php

use App\Http\Middleware\EnsureActiveAccount;
use App\Http\Middleware\EnsureLifeAccount;
use App\Http\Middleware\EnsurePasswordRotated;
use App\Http\Middleware\EnsureRequestOrigin;
use App\Http\Middleware\EnsureUserRole;
use App\Support\ApiExceptionRenderer;
use App\Support\TrustedProxies;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Laravel\Sanctum\Http\Middleware\CheckAbilities;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Nginx (HTTP/HTTPS) envía X-Forwarded-*; solo se confía en TRUSTED_PROXIES (RNF-05).
        $middleware->trustProxies(
            at: TrustedProxies::fromEnv(env('TRUSTED_PROXIES')),
            // Solo FOR y PROTO: Host/Port reenviados no se confian (evita envenenar URLs con X-Forwarded-Host).
            headers: TrustedProxies::HEADERS,
        );
        $middleware->api(prepend: [
            EnsureRequestOrigin::class,
        ]);
        $middleware->statefulApi();
        $middleware->alias([
            'role' => EnsureUserRole::class,
            'active' => EnsureActiveAccount::class,
            'password.rotated' => EnsurePasswordRotated::class,
            'life' => EnsureLifeAccount::class,
            'abilities' => CheckAbilities::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(fn (Request $request) => ApiExceptionRenderer::wantsJson($request));
        $exceptions->render(fn (Throwable $exception, Request $request) => ApiExceptionRenderer::render($exception, $request));
    })->create();
