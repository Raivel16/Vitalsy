<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureActiveAccount
{
    /**
     * Una cuenta desactivada pierde el acceso aunque conserve una sesión previa (RF-104).
     *
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if ($user !== null && $user->is_active === false) {
            Auth::guard('web')->logout();

            return response()->json(['message' => 'Debe iniciar sesión para continuar.'], 401);
        }

        return $next($request);
    }
}
