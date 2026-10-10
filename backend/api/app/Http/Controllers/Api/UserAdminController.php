<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Http\Requests\UpdateUserRequest;
use App\Models\User;
use App\Services\Users\UserAdministration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserAdminController extends Controller
{
    public function __construct(private readonly UserAdministration $users) {}

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'search' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', 'in:active,inactive,all'],
        ]);

        return response()->json(['data' => $this->users->list($data['search'] ?? null, $data['status'] ?? null)]);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        return response()->json($this->users->create($request->validated(), $request->user()), 201);
    }

    public function update(UpdateUserRequest $request, string $id): JsonResponse
    {
        $user = User::query()->findOrFail($id);

        return response()->json(['user' => $this->users->update($user, $request->validated(), $request->user())]);
    }

    public function deactivate(Request $request, string $id): JsonResponse
    {
        $user = User::query()->findOrFail($id);

        return response()->json(['user' => $this->users->deactivate($user, $request->user())]);
    }

    public function members(Request $request): JsonResponse
    {
        $role = $request->query('role');

        return response()->json(['data' => $this->users->careMembers(is_string($role) ? $role : null)]);
    }
}
