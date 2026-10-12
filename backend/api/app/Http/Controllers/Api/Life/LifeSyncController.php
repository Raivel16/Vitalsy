<?php

namespace App\Http\Controllers\Api\Life;

use App\Http\Controllers\Controller;
use App\Models\LifeAccount;
use App\Services\Life\LifeSync;
use App\Services\Life\LifeSyncLimitExceeded;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LifeSyncController extends Controller
{
    private const MAX_TOTAL_BODY_CHARS = 1000000;

    public function store(Request $request, LifeSync $sync): JsonResponse
    {
        $data = $request->validate([
            'items' => ['required', 'array', 'max:200'],
            'items.*' => ['array'],
        ]);

        $totalBody = 0;
        foreach ($data['items'] as $item) {
            $totalBody += is_string($item['body'] ?? null) ? strlen($item['body']) : 0;
        }
        if ($totalBody > self::MAX_TOTAL_BODY_CHARS) {
            return $this->tooLarge('El lote excede el tamaño total permitido.');
        }

        /** @var LifeAccount $account */
        $account = $request->user();

        try {
            return response()->json($sync->ingest($account, $data['items']));
        } catch (LifeSyncLimitExceeded $e) {
            return $this->tooLarge($e->getMessage());
        }
    }

    private function tooLarge(string $message): JsonResponse
    {
        return response()->json(['code' => 'batch_too_large', 'message' => $message], 422);
    }
}
