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

        $consent = LifeConsent::query()->updateOrCreate(
            ['life_account_id' => $account->id],
            ['sharing_enabled' => $enabled, 'revoked_at' => $enabled ? null : now()],
        );

        return response()->json([
            'sharingEnabled' => $consent->sharing_enabled,
            'revokedAt' => $consent->revoked_at?->toIso8601String(),
        ]);
    }
}
