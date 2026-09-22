<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdmissionEncounter;
use App\Models\CareActivityCompletion;
use App\Models\NursingEvolutionNote;
use App\Services\InpatientCare\EmarService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class EmarCareController extends Controller
{
    public function __construct(private readonly EmarService $emar)
    {
    }

    public function emar(string $encounterId): JsonResponse
    {
        return response()->json($this->emar->listShift($encounterId));
    }

    public function administer(Request $request, string $encounterId, int $doseId): JsonResponse
    {
        $data = $request->validate([
            'patientBarcode' => ['required', 'string'],
            'drugBarcode' => ['required', 'string'],
            'sign' => ['required', 'boolean'],
        ], [
            'patientBarcode.required' => 'El código del paciente es obligatorio.',
            'drugBarcode.required' => 'El código del medicamento es obligatorio.',
            'sign.required' => 'Debe firmar digitalmente la dosis administrada.',
        ]);

        return response()->json(
            $this->emar->administer($encounterId, $doseId, $data, $request->user()),
        );
    }

    public function storeNursingNote(Request $request, string $encounterId): JsonResponse
    {
        $this->requireEncounter($encounterId);
        $data = $request->validate([
            'body' => ['required', 'string', 'min:5'],
        ], [
            'body.required' => 'La nota de evolución de enfermería es obligatoria.',
        ]);

        $note = NursingEvolutionNote::query()->create([
            'encounter_id' => $encounterId,
            'author_user_id' => $request->user()?->id,
            'body' => $data['body'],
        ]);
        $note->load('author');

        return response()->json([
            'note' => [
                'id' => $note->id,
                'body' => $note->body,
                'authorName' => $note->author?->name,
                'authoredAt' => optional($note->created_at)?->toIso8601String(),
            ],
        ], 201);
    }

    public function storeCareActivity(Request $request, string $encounterId): JsonResponse
    {
        $this->requireEncounter($encounterId);
        $data = $request->validate([
            'activityLabel' => ['required', 'string', 'min:3'],
        ], [
            'activityLabel.required' => 'La actividad de cuidado es obligatoria.',
        ]);

        $activity = CareActivityCompletion::query()->create([
            'encounter_id' => $encounterId,
            'activity_label' => $data['activityLabel'],
            'completed_at' => now(),
            'completed_by' => $request->user()?->id,
        ]);

        return response()->json([
            'activity' => [
                'id' => $activity->id,
                'activityLabel' => $activity->activity_label,
                'completedAt' => optional($activity->completed_at)?->toIso8601String(),
            ],
        ], 201);
    }

    private function requireEncounter(string $encounterId): AdmissionEncounter
    {
        $encounter = AdmissionEncounter::query()->where('encounter_id', $encounterId)->first();
        if (! $encounter) {
            throw new NotFoundHttpException('No se encontró el ingreso.');
        }

        return $encounter;
    }
}
