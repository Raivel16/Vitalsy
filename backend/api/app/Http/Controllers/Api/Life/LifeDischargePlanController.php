<?php

namespace App\Http\Controllers\Api\Life;

use App\Http\Controllers\Controller;
use App\Models\LifeDischargePlan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LifeDischargePlanController extends Controller
{
    /**
     * RF-97: reclama el plan con su código (o código de invitación). El primer lector lo reclama;
     * la misma cuenta puede releerlo; otra cuenta recibe 409. Devuelve solo el payload.
     */
    public function show(Request $request, string $code): JsonResponse
    {
        $accountId = $request->user()->getKey();

        return DB::transaction(function () use ($code, $accountId) {
            $plan = LifeDischargePlan::query()
                ->where(fn ($q) => $q->where('code', $code)->orWhere('invitation_code', $code))
                ->lockForUpdate()
                ->first();

            $error = $plan
                ? $this->claimError($plan, $accountId)
                : $this->error('plan_not_found', 'No encontramos un plan con ese código.', 404);

            return $error ?? response()->json($plan->payload);
        });
    }

    /** Reclama el plan si está libre; devuelve la respuesta de error o null si la cuenta puede leerlo. */
    private function claimError(LifeDischargePlan $plan, mixed $accountId): ?JsonResponse
    {
        if ($plan->claimed_by_account_id === null) {
            if ($plan->valid_until !== null && $plan->valid_until->lt(today())) {
                return $this->error('plan_expired', 'Este plan venció. Solicite uno nuevo en el hospital.', 410);
            }
            $plan->update(['status' => 'reclamado', 'claimed_by_account_id' => $accountId, 'claimed_at' => now()]);
        } elseif ((int) $plan->claimed_by_account_id !== (int) $accountId) {
            return $this->error('plan_claimed', 'Este plan ya fue reclamado por otra cuenta.', 409);
        }

        return null;
    }

    private function error(string $code, string $message, int $status): JsonResponse
    {
        return response()->json(['code' => $code, 'message' => $message], $status);
    }
}
