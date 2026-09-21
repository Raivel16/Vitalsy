<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserRole
{
    /**
     * @param  Closure(Request): Response  $next
     * @param  string  ...$roles
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $role = $request->user()?->role;
        if (! is_string($role) || ! in_array($role, $roles, true)) {
            return response()->json(['message' => 'No tiene permiso para esta acción.'], 403);
        }

        return $next($request);
    }
}
