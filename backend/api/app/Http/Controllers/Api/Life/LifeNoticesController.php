<?php

namespace App\Http\Controllers\Api\Life;

use App\Http\Controllers\Controller;
use App\Services\Life\NudgeEngine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LifeNoticesController extends Controller
{
    /** Avisos preventivos y de hábito calculados bajo demanda (RF-91); no se persisten. */
    public function index(Request $request, NudgeEngine $engine): JsonResponse
    {
        return response()->json(['notices' => $engine->notices($request->user())]);
    }
}
