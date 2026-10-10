<?php

namespace App\Services\Users;

use App\Exceptions\ClinicalRuleException;
use App\Models\User;
use App\Support\RoleCatalog;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/** RF-101–104: ciclo de vida de cuentas con auditoría; nunca elimina usuarios. */
class UserAdministration
{
    private const CARE_ROLES = ['enfermera_piso', 'auxiliar_enfermeria', 'enfermera_supervisora'];

    /** @return array<int, array<string, mixed>> */
    public function list(?string $search, ?string $status): array
    {
        $query = User::query()->orderBy('name');
        if ($status === 'active') {
            $query->where('is_active', true);
        } elseif ($status === 'inactive') {
            $query->where('is_active', false);
        }
        if ($search !== null && trim($search) !== '') {
            $term = '%'.mb_strtolower(trim($search)).'%';
            $query->where(fn ($q) => $q->whereRaw('LOWER(name) LIKE ?', [$term])->orWhereRaw('LOWER(email) LIKE ?', [$term]));
        }

        return $query->get()->map(fn (User $u) => $this->present($u))->all();
    }

    /**
     * @param  array{name: string, email: string, role: string}  $data
     * @return array{user: array<string, mixed>, temporaryPassword: string}
     */
    public function create(array $data, User $actor): array
    {
        $password = Str::password(14, symbols: false);
        $user = DB::transaction(function () use ($data, $password, $actor) {
            $this->assertActorStillAdministrator($actor);
            $user = User::query()->create([
                'name' => trim($data['name']),
                'email' => mb_strtolower(trim($data['email'])),
                'role' => $data['role'],
                'password' => $password,
                'is_active' => true,
                'must_change_password' => true,
            ]);
            $this->audit($actor, $user, 'user.created', ['role' => $user->role]);

            return $user;
        });

        return ['user' => $this->present($user), 'temporaryPassword' => $password];
    }

    /**
     * @param  array<string, string>  $data
     * @return array<string, mixed>
     */
    public function update(User $user, array $data, User $actor): array
    {
        $changes = [];
        foreach (['name', 'email', 'role'] as $field) {
            if (array_key_exists($field, $data)) {
                $changes[$field] = $field === 'email' ? mb_strtolower(trim($data[$field])) : trim($data[$field]);
            }
        }

        DB::transaction(function () use ($user, $changes, $actor) {
            // Bloquea las filas de administradores para que el chequeo y el cambio sean atómicos.
            $this->lockAdministrators();
            $this->assertActorStillAdministrator($actor);
            $current = User::query()->lockForUpdate()->findOrFail($user->getKey());

            if (isset($changes['role']) && $changes['role'] !== $current->role) {
                if ($current->is($actor)) {
                    throw new ClinicalRuleException('No puede cambiar su propio rol.');
                }
                if ($current->role === 'administrador_accesos' && $current->is_active) {
                    $this->assertAnotherActiveAdministrator($current);
                }
            }

            $before = $current->only(array_keys($changes));
            $current->update($changes);
            $this->audit($actor, $current, 'user.updated', ['before' => $before, 'after' => $changes]);
        });

        return $this->present($user->fresh());
    }

    /** @return array<string, mixed> */
    public function deactivate(User $user, User $actor): array
    {
        DB::transaction(function () use ($user, $actor) {
            $this->lockAdministrators();
            $this->assertActorStillAdministrator($actor);
            $current = User::query()->lockForUpdate()->findOrFail($user->getKey());

            if ($current->is($actor)) {
                throw new ClinicalRuleException('No puede desactivar su propia cuenta.');
            }
            if (! $current->is_active) {
                throw new ClinicalRuleException('La cuenta ya está desactivada.');
            }
            if ($current->role === 'administrador_accesos') {
                $this->assertAnotherActiveAdministrator($current);
            }

            $current->forceFill(['is_active' => false, 'deactivated_at' => now()])->save();
            if (Schema::hasTable('sessions')) {
                DB::table('sessions')->where('user_id', $current->getKey())->delete();
            }
            $this->audit($actor, $current, 'user.deactivated', []);
        });

        return $this->present($user->fresh());
    }

    /** Revalida al actor dentro de la transacción: pudo desactivarse tras pasar el middleware. */
    private function assertActorStillAdministrator(User $actor): void
    {
        $fresh = User::query()->lockForUpdate()->find($actor->getKey());
        if ($fresh === null || ! $fresh->is_active || $fresh->role !== 'administrador_accesos') {
            throw new ClinicalRuleException('Su cuenta ya no tiene permiso para esta acción.');
        }
    }

    private function lockAdministrators(): void
    {
        User::query()->where('role', 'administrador_accesos')->lockForUpdate()->pluck('id');
    }

    private function assertAnotherActiveAdministrator(User $user): void
    {
        $others = User::query()->where('role', 'administrador_accesos')
            ->where('is_active', true)->whereKeyNot($user->getKey())->count();
        if ($others === 0) {
            throw new ClinicalRuleException('Debe quedar al menos un administrador de accesos activo.');
        }
    }

    /** @return array<int, array{id: int, name: string, role: string, isActive: bool}> */
    public function careMembers(?string $role): array
    {
        $roles = $role !== null && in_array($role, self::CARE_ROLES, true) ? [$role] : self::CARE_ROLES;

        return User::query()->whereIn('role', $roles)->where('is_active', true)->orderBy('name')->get()
            ->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'role' => $u->role,
                'isActive' => (bool) $u->is_active,
            ])->all();
    }

    /** @return array<string, mixed> */
    public function present(User $u): array
    {
        return [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'role' => $u->role,
            'roleLabel' => RoleCatalog::label($u->role),
            'isActive' => (bool) $u->is_active,
            'mustChangePassword' => (bool) $u->must_change_password,
            'deactivatedAt' => $u->deactivated_at?->toIso8601String(),
        ];
    }

    /** @param  array<string, mixed>  $details */
    private function audit(User $actor, User $target, string $action, array $details): void
    {
        DB::table('access_audit_logs')->insert([
            'actor_user_id' => $actor->getKey(),
            'target_user_id' => $target->getKey(),
            'action' => $action,
            'details' => json_encode($details),
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
