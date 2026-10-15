<?php

namespace App\Http\Controllers\Api\Life;

use App\Http\Controllers\Controller;
use App\Models\LifeAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class LifeAuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $request->merge(['email' => mb_strtolower(trim((string) $request->input('email')))]);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:255', 'unique:life_accounts,email'],
            'password' => ['required', 'string', Password::min(10)->letters()->numbers()],
        ], [
            'email.unique' => 'Ya existe una cuenta con ese correo.',
        ]);

        $account = LifeAccount::query()->create($data);

        return response()->json($this->payload($account), 201);
    }

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);
        $email = mb_strtolower(trim($data['email']));

        $account = LifeAccount::query()->where('email', $email)->first();
        if ($account === null || ! Hash::check($data['password'], $account->password)) {
            throw ValidationException::withMessages([
                'email' => 'El correo o la contraseña no son correctos.',
            ]);
        }

        return response()->json($this->payload($account));
    }

    /** Revoca solo el token de la sesión actual. */
    public function logout(Request $request): Response
    {
        $request->user()->currentAccessToken()->delete();

        return response()->noContent();
    }

    /** @return array{token: string, account: array{id: int, name: string, email: string}} */
    private function payload(LifeAccount $account): array
    {
        return [
            'token' => $account->createToken('life', ['life'])->plainTextToken,
            'account' => ['id' => $account->id, 'name' => $account->name, 'email' => $account->email],
        ];
    }
}
