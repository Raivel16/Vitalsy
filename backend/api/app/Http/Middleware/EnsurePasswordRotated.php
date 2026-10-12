<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePasswordRotated
{
    /**
     * Una cuenta con contraseña temporal solo puede cambiarla o cerrar sesión (RF-102).
     *
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if ($user !== null && ! $user instanceof User) {
            return response()->json(['message' => 'No tiene permiso para esta acción.'], 403);
        }
        if ($user !== null && $user->must_change_password === true) {
            return response()->json([
                'message' => 'Debe cambiar la contraseña temporal para continuar.',
                'code' => 'password_change_required',
            ], 403);
        }

        return $next($request);
    }
}
