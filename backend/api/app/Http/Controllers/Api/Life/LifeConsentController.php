<?php

namespace App\Http\Controllers\Api\Life;

use App\Http\Controllers\Controller;
use App\Models\LifeAccount;
use App\Models\LifeConsent;
use App\Models\LifeLinkCode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class LifeConsentController extends Controller
{
    public function update(Request $request): JsonResponse
    {
        $data = $request->validate([
            'sharingEnabled' => ['required', 'boolean'],
        ], [
            'sharingEnabled.required' => 'Indique si desea compartir sus datos.',
            'sharingEnabled.boolean' => 'El consentimiento debe ser verdadero o falso.',
        ]);

        /** @var LifeAccount $account */
        $account = $request->user();
        $enabled = (bool) $data['sharingEnabled'];

        $consent = DB::transaction(function () use ($account, $enabled): LifeConsent {
            // Mismo bloqueo de fila que la emisión de códigos: revocar y emitir se serializan.
            $existing = LifeConsent::query()->where('life_account_id', $account->id)->lockForUpdate()->first();
            // Reenviar `false` con la revocación ya registrada conserva la fecha original.
            $revokedAt = $enabled ? null : ($existing?->revoked_at ?? now());

            $consent = LifeConsent::query()->updateOrCreate(
                ['life_account_id' => $account->id],
                ['sharing_enabled' => $enabled, 'revoked_at' => $revokedAt],
            );

            if (! $enabled) {
                // Revocar invalida los códigos pendientes (contrato RF-94).
                LifeLinkCode::query()
                    ->where('life_account_id', $account->id)
                    ->whereNull('consumed_at')
                    ->where('expires_at', '>', now())
                    ->update(['expires_at' => now()]);
            }

            return $consent;
        });

        return response()->json([
            'sharingEnabled' => $consent->sharing_enabled,
            'revokedAt' => $consent->revoked_at?->toIso8601String(),
        ]);
    }
}
