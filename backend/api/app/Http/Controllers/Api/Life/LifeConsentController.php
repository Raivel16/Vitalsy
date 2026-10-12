<?php

namespace App\Http\Controllers\Api\Life;

use App\Http\Controllers\Controller;
use App\Models\LifeAccount;
use App\Models\LifeConsent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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

        $existing = LifeConsent::query()->where('life_account_id', $account->id)->first();
        // Reenviar `false` con la revocación ya registrada conserva la fecha original.
        $revokedAt = $enabled ? null : ($existing?->revoked_at ?? now());

        $consent = LifeConsent::query()->updateOrCreate(
            ['life_account_id' => $account->id],
            ['sharing_enabled' => $enabled, 'revoked_at' => $revokedAt],
        );

        return response()->json([
            'sharingEnabled' => $consent->sharing_enabled,
            'revokedAt' => $consent->revoked_at?->toIso8601String(),
        ]);
    }
}
