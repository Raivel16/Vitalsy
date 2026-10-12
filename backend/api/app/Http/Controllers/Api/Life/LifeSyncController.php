<?php

namespace App\Http\Controllers\Api\Life;

use App\Http\Controllers\Controller;
use App\Models\LifeAccount;
use App\Services\Life\LifeSync;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LifeSyncController extends Controller
{
    public function store(Request $request, LifeSync $sync): JsonResponse
    {
        $data = $request->validate([
            'items' => ['required', 'array', 'max:200'],
            'items.*' => ['array'],
        ]);

        /** @var LifeAccount $account */
        $account = $request->user();

        return response()->json($sync->ingest($account, $data['items']));
    }
}
