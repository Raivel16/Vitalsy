<?php

namespace App\Http\Middleware;

use App\Models\LifeAccount;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureLifeAccount
{
    /**
     * Las rutas de Life solo admiten cuentas ciudadanas, nunca personal clínico.
     *
     * @param  Closure(Request): Response  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless($request->user() instanceof LifeAccount, 403, 'No tiene permiso para esta acción.');

        return $next($request);
    }
}
