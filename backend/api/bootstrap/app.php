<?php

use App\Exceptions\ClinicalRuleException;
use App\Http\Middleware\EnsureActiveAccount;
use App\Http\Middleware\EnsureLifeAccount;
use App\Http\Middleware\EnsurePasswordRotated;
use App\Http\Middleware\EnsureRequestOrigin;
use App\Http\Middleware\EnsureUserRole;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Illuminate\Session\TokenMismatchException;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\Http\Middleware\CheckAbilities;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    // RNF-01: canales privados autenticados en /api/v1/broadcasting/auth con el mismo token Sanctum.
    ->withBroadcasting(
        __DIR__.'/../routes/channels.php',
        ['prefix' => 'api/v1', 'middleware' => ['auth:sanctum', 'active']],
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Nginx (HTTP/HTTPS) envía X-Forwarded-*; necesario para URL/scheme correctos en LAN.
        $middleware->trustProxies(
            at: '*',
            headers: Request::HEADER_X_FORWARDED_FOR
                | Request::HEADER_X_FORWARDED_HOST
                | Request::HEADER_X_FORWARDED_PORT
                | Request::HEADER_X_FORWARDED_PROTO,
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
        $exceptions->shouldRenderJsonWhen(fn (Request $request) => $request->is('api/*') || $request->expectsJson());

        $exceptions->render(function (TokenMismatchException $exception, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json(['message' => 'La sesión expiró. Vuelva a intentarlo.'], 419);
            }
        });

        $exceptions->render(function (AuthenticationException $exception, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json(['message' => 'Debe iniciar sesión para continuar.'], 401);
            }
        });

        $exceptions->render(function (ValidationException $exception, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'message' => $exception->validator->errors()->first() ?: 'Revise los datos e intente de nuevo.',
                    'errors' => $exception->errors(),
                ], 422);
            }
        });

        $exceptions->render(function (Throwable $exception, Request $request) {
            if (! $request->is('api/*') && ! $request->expectsJson()) {
                return null;
            }
            if ($exception instanceof ValidationException) {
                return null;
            }

            $status = $exception instanceof HttpExceptionInterface ? $exception->getStatusCode() : 500;
            $message = $exception->getMessage();
            $technical = $status >= 500
                || $message === ''
                || preg_match('/SQLSTATE|Exception|Stack trace|Server Error|could not be found/i', $message) === 1;

            $body = [
                'message' => $technical ? 'No se pudo completar la operación. Intente de nuevo.' : $message,
            ];
            if ($exception instanceof ClinicalRuleException && $exception->errorCode !== null) {
                $body['code'] = $exception->errorCode;
            }

            return response()->json($body, $status);
        });
    })->create();
