<?php

namespace App\Http\Controllers\Api\Life;

use App\Http\Controllers\Controller;
use App\Models\LifeAccount;
use App\Models\LifeConsent;
use App\Models\LifeLinkCode;
use App\Services\Life\LifeLinkCodeGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LifeLinkCodeController extends Controller
{
    private const TTL_MINUTES = 30;

    private const MAX_ATTEMPTS = 5;

    /** Emite un código de vinculación (RF-94); invalida los anteriores sin consumir. */
    public function store(Request $request): JsonResponse
    {
        /** @var LifeAccount $account */
        $account = $request->user();

        $closed = false;
        $link = DB::transaction(function () use ($account, &$closed): ?LifeLinkCode {
            // Serializa emisiones y revocaciones de la misma cuenta, y revalida bajo el bloqueo.
            $consent = LifeConsent::query()->where('life_account_id', $account->id)->lockForUpdate()->first();
            if ($consent === null || ! $consent->sharing_enabled) {
                $closed = true;

                return null;
            }

            LifeLinkCode::query()
                ->where('life_account_id', $account->id)
                ->whereNull('consumed_at')
                ->where('expires_at', '>', now())
                ->update(['expires_at' => now()]);

            $code = $this->uniqueCode();
            if ($code === null) {
                return null;
            }

            return LifeLinkCode::query()->create([
                'life_account_id' => $account->id,
                'code' => $code,
                'expires_at' => now()->addMinutes(self::TTL_MINUTES),
            ]);
        });

        if ($closed) {
            return response()->json([
                'code' => 'sharing_closed',
                'message' => 'Active la compartición de datos para generar un código de vinculación.',
            ], 409);
        }

        if ($link === null) {
            return response()->json([
                'code' => 'code_unavailable',
                'message' => 'No se pudo generar un código de vinculación. Intente nuevamente en unos instantes.',
            ], 503);
        }

        return response()->json([
            'code' => $link->code,
            'expiresAt' => $link->expires_at->toIso8601String(),
        ], 201);
    }

    private function uniqueCode(): ?string
    {
        $generator = app(LifeLinkCodeGenerator::class);
        for ($attempt = 0; $attempt < self::MAX_ATTEMPTS; $attempt++) {
            $code = $generator->generate();
            if (! LifeLinkCode::query()->where('code', $code)->exists()) {
                return $code;
            }
        }

        return null;
    }
}
