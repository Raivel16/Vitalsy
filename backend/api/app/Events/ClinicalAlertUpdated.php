<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;

/** Cambio de estado de una alerta (acuse, escalamiento, cierre): los clientes refrescan su bandeja. */
class ClinicalAlertUpdated implements ShouldBroadcastNow
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
        return 'alert.updated';
    }

    /** @return array<string, mixed> */
    public function broadcastWith(): array
    {
        return $this->payload;
    }
}
