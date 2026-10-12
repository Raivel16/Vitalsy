<?php

namespace App\Http\Controllers\Api\Life;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LifeDischargePlanController extends Controller
{
    /** Pendiente de implementar en una tarea posterior del plan de integración Life. */
    public function show(Request $request, string $code): JsonResponse
    {
        return response()->json(['message' => 'No implementado'], 501);
    }
}
