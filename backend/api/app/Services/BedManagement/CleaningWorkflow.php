<?php

namespace App\Services\BedManagement;

use App\Exceptions\ClinicalRuleException;
use App\Models\Bed;
use App\Models\BedReadinessCheck;
use App\Models\CleaningOrder;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Máquina de estados de la orden de limpieza (RF-74…RF-77).
 *
 * pendiente → completada → equipada → habilitada
 * La cama solo vuelve a `available` al habilitar (paso final de la supervisora).
 */
class CleaningWorkflow
{
    public const STATUS_PENDING = 'pendiente';

    public const STATUS_DISINFECTED = 'completada';

    public const STATUS_EQUIPPED = 'equipada';

    public const STATUS_ENABLED = 'habilitada';

    /** Ítems del checklist de habilitación clínica que deben estar completos. */
    public const CHECKLIST_ITEMS = ['superficies', 'portasuero', 'colchon', 'ventilacion'];

    /** @param array<string, mixed> $checklist */
    public function complete(int $orderId, array $checklist, User $user): CleaningOrder
    {
        $order = CleaningOrder::query()->find($orderId);
        if (! $order) {
            throw new NotFoundHttpException('No se encontró la orden de limpieza.');
        }
        if ($order->status !== self::STATUS_PENDING) {
            throw new ClinicalRuleException('La desinfección de esta unidad ya fue registrada.');
        }

        $normalized = [];
        foreach (self::CHECKLIST_ITEMS as $item) {
            if (($checklist[$item] ?? false) !== true) {
                throw new ClinicalRuleException('Complete todo el checklist antes de registrar la desinfección.');
            }
            $normalized[$item] = true;
        }

        $order->update([
            'status' => self::STATUS_DISINFECTED,
            'checklist' => $normalized,
            'completed_at' => now(),
            'disinfected_by' => $user->id,
        ]);

        return $order->fresh();
    }

    /** @return array{order: CleaningOrder, check: BedReadinessCheck} */
    public function equip(Bed $bed, User $user): array
    {
        $order = $this->latestOrder($bed);
        if (! $order || $order->status !== self::STATUS_DISINFECTED) {
            throw new ClinicalRuleException('La desinfección de la unidad aún no está completa.');
        }

        return DB::transaction(function () use ($bed, $order, $user) {
            $check = BedReadinessCheck::query()->create([
                'bed_id' => $bed->id,
                'cleaning_order_id' => $order->id,
                'linen_ok' => true,
                'supplies_ok' => true,
                'confirmed_by' => $user->id,
                'confirmed_at' => now(),
            ]);
            $order->update([
                'status' => self::STATUS_EQUIPPED,
                'equipped_at' => now(),
                'equipped_by' => $user->id,
            ]);

            return ['order' => $order->fresh(), 'check' => $check];
        });
    }

    public function enable(Bed $bed, User $user): CleaningOrder
    {
        if ($bed->status !== 'cleaning') {
            throw new ClinicalRuleException('La unidad no está en proceso de limpieza.');
        }

        $order = $this->latestOrder($bed);
        $equipped = $order
            && $order->status === self::STATUS_EQUIPPED
            && BedReadinessCheck::query()
                ->where('bed_id', $bed->id)
                ->where('cleaning_order_id', $order->id)
                ->exists();
        if (! $equipped) {
            throw new ClinicalRuleException('La unidad aún no está equipada.');
        }

        return DB::transaction(function () use ($bed, $order, $user) {
            $order->update([
                'status' => self::STATUS_ENABLED,
                'enabled_at' => now(),
                'enabled_by' => $user->id,
            ]);
            $bed->update(['status' => 'available']);

            return $order->fresh();
        });
    }

    private function latestOrder(Bed $bed): ?CleaningOrder
    {
        return CleaningOrder::query()->where('bed_id', $bed->id)->latest('id')->first();
    }
}
