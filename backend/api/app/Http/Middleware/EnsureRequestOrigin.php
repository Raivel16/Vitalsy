<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Sanctum only starts the SPA session when Origin/Referer match SANCTUM_STATEFUL_DOMAINS.
 * Some mobile browsers omit those headers on same-origin JSON POSTs (e.g. login via LAN IP).
 * In that case, derive Origin from the request host so stateful cookies still work.
 */
class EnsureRequestOrigin
{
    public function handle(Request $request, Closure $next): Response
    {
        // La app móvil (Bearer, sin cookies ni Origin) no debe pasar por la rama stateful de Sanctum (419 CSRF).
        $tokenClient = $request->bearerToken() !== null || $request->is('api/v1/life/*');

        if (! $tokenClient && ! $request->headers->get('Origin') && ! $request->headers->get('Referer')) {
            $request->headers->set('Origin', $request->getSchemeAndHttpHost());
        }

        return $next($request);
    }
}
