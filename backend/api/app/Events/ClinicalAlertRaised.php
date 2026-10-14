<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/**
 * RNF-01: alerta nueva (o escalada hacia este usuario). Se emite de inmediato
 * (no en cola) al canal privado del destinatario. La carga es mínima: la
 * bandeja de la API sigue siendo la fuente de verdad (también para la sirena).
 */
class ClinicalAlertRaised implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets;

    /** @param array<string, mixed> $payload */
    public function __construct(public readonly int $userId, public readonly array $payload) {}

    /** @return list<PrivateChannel> */
    public function broadcastOn(): array
    {
        return [new PrivateChannel('alerts.'.$this->userId)];
    }

    public function broadcastAs(): string
    {
        return 'alert.raised';
    }

    /** @return array<string, mixed> */
    public function broadcastWith(): array
    {
        return $this->payload;
    }
}
