<?php

namespace App\Support;

use App\Exceptions\ClinicalRuleException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Session\TokenMismatchException;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Throwable;

/**
 * Respuestas JSON de error de la API en español, sin filtrar detalles técnicos.
 */
final class ApiExceptionRenderer
{
    private const GENERIC_MESSAGE = 'No se pudo completar la operación. Intente de nuevo.';

    public static function wantsJson(Request $request): bool
    {
        return $request->is('api/*') || $request->expectsJson();
    }

    public static function render(Throwable $exception, Request $request): ?JsonResponse
    {
        if (! self::wantsJson($request)) {
            return null;
        }

        return match (true) {
            $exception instanceof TokenMismatchException => response()->json(['message' => 'La sesión expiró. Vuelva a intentarlo.'], 419),
            $exception instanceof AuthenticationException => response()->json(['message' => 'Debe iniciar sesión para continuar.'], 401),
            $exception instanceof ValidationException => self::validationResponse($exception),
            default => self::genericResponse($exception),
        };
    }

    private static function validationResponse(ValidationException $exception): JsonResponse
    {
        return response()->json([
            'message' => $exception->validator->errors()->first() ?: 'Revise los datos e intente de nuevo.',
            'errors' => $exception->errors(),
        ], 422);
    }

    private static function genericResponse(Throwable $exception): JsonResponse
    {
        $status = $exception instanceof HttpExceptionInterface ? $exception->getStatusCode() : 500;
        $body = ['message' => self::isTechnical($exception, $status) ? self::GENERIC_MESSAGE : $exception->getMessage()];

        if ($exception instanceof ClinicalRuleException && $exception->errorCode !== null) {
            $body['code'] = $exception->errorCode;
        }

        return response()->json($body, $status);
    }

    private static function isTechnical(Throwable $exception, int $status): bool
    {
        $message = $exception->getMessage();

        return $status >= 500
            || $message === ''
            || preg_match('/SQLSTATE|Exception|Stack trace|Server Error|could not be found/i', $message) === 1;
    }
}
