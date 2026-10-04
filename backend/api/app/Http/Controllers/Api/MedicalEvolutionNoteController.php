<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdmissionEncounter;
use App\Models\MedicalEvolutionNote;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class MedicalEvolutionNoteController extends Controller
{
    public function index(string $encounterId): JsonResponse
    {
        $this->requireEncounter($encounterId);

        $notes = MedicalEvolutionNote::query()
            ->with('author')
            ->where('encounter_id', $encounterId)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (MedicalEvolutionNote $note) => $this->present($note))
            ->all();

        return response()->json(['notes' => $notes]);
    }

    public function store(Request $request, string $encounterId): JsonResponse
    {
        $this->requireEncounter($encounterId);

        $data = $request->validate([
            'body' => ['required', 'string', 'min:5'],
            'sign' => ['sometimes', 'boolean'],
        ], [
            'body.required' => 'El campo nota de evolución es obligatorio.',
            'body.min' => 'La nota de evolución debe tener al menos 5 caracteres.',
        ]);

        $note = MedicalEvolutionNote::query()->create([
            'encounter_id' => $encounterId,
            'author_user_id' => $request->user()?->id,
            'body' => $data['body'],
            'signed_at' => ($data['sign'] ?? false) ? now() : null,
        ]);
        $note->load('author');

        return response()->json(['note' => $this->present($note)], 201);
    }

    private function requireEncounter(string $encounterId): AdmissionEncounter
    {
        $encounter = AdmissionEncounter::query()->where('encounter_id', $encounterId)->first();
        if (! $encounter) {
            throw new NotFoundHttpException('No se encontró el ingreso.');
        }

        return $encounter;
    }

    /**
     * @return array{id: int, body: string, signed: bool, signedAt: string|null, authoredAt: string|null, authorName: string|null}
     */
    private function present(MedicalEvolutionNote $note): array
    {
        return [
            'id' => $note->id,
            'body' => $note->body,
            'signed' => $note->signed_at !== null,
            'signedAt' => optional($note->signed_at)?->toIso8601String(),
            'authoredAt' => optional($note->created_at)?->toIso8601String(),
            'authorName' => $note->author?->name,
        ];
    }
}
