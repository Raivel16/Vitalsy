<?php

namespace App\Http\Controllers\Api\Life;

use App\Http\Controllers\Controller;
use App\Models\LifeAccount;
use App\Models\LifeConsent;
use App\Models\LifeLinkCode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class LifeLinkCodeController extends Controller
{
    private const TTL_MINUTES = 30;

    /** Emite un código de vinculación (RF-94); invalida los anteriores sin consumir. */
    public function store(Request $request): JsonResponse
    {
        /** @var LifeAccount $account */
        $account = $request->user();

        $open = LifeConsent::query()
            ->where('life_account_id', $account->id)
            ->where('sharing_enabled', true)
            ->exists();
        if (! $open) {
            return response()->json([
                'code' => 'sharing_closed',
                'message' => 'Active la compartición de datos para generar un código de vinculación.',
            ], 409);
        }

        LifeLinkCode::query()
            ->where('life_account_id', $account->id)
            ->whereNull('consumed_at')
            ->where('expires_at', '>', now())
            ->update(['expires_at' => now()]);

        $link = LifeLinkCode::query()->create([
            'life_account_id' => $account->id,
            'code' => $this->uniqueCode(),
            'expires_at' => now()->addMinutes(self::TTL_MINUTES),
        ]);

        return response()->json([
            'code' => $link->code,
            'expiresAt' => $link->expires_at->toIso8601String(),
        ], 201);
    }

    private function uniqueCode(): string
    {
        do {
            $raw = Str::upper(Str::random(8));
            $code = 'VL-'.substr($raw, 0, 4).'-'.substr($raw, 4, 4);
        } while (LifeLinkCode::query()->where('code', $code)->exists());

        return $code;
    }
}
