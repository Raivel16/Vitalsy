<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

/*
 * RNF-01: cada usuario de personal solo escucha su propio canal de alertas.
 * El callback recibe cualquier autenticable (p. ej. LifeAccount, RF-89): se
 * rechaza explícitamente todo lo que no sea un usuario de personal activo.
 */
Broadcast::channel('alerts.{userId}', function ($principal, string $userId): bool {
    return $principal instanceof User
        && (bool) $principal->is_active
        && $principal->id === (int) $userId;
});
