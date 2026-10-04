<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\InpatientCare\ClinicalVisitBoard;
use Illuminate\Http\JsonResponse;

class ClinicalVisitController extends Controller
{
    public function __construct(private readonly ClinicalVisitBoard $board) {}

    public function show(string $encounterId): JsonResponse
    {
        return response()->json($this->board->forEncounter($encounterId));
    }
}
