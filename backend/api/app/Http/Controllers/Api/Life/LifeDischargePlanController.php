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

            if (! $plan) {
                return response()->json(['code' => 'plan_not_found', 'message' => 'No encontramos un plan con ese código.'], 404);
            }

            if ($plan->claimed_by_account_id === null) {
                $plan->update(['status' => 'reclamado', 'claimed_by_account_id' => $accountId, 'claimed_at' => now()]);
            } elseif ((int) $plan->claimed_by_account_id !== (int) $accountId) {
                return response()->json(['code' => 'plan_claimed', 'message' => 'Este plan ya fue reclamado por otra cuenta.'], 409);
            }

            return response()->json($plan->payload);
        });
    }
}
