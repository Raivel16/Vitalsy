<?php

namespace App\Services\BedManagement;

use App\Exceptions\ClinicalRuleException;
use App\Models\Bed;
use App\Models\BedInfrastructureChange;
use App\Models\User;
use App\Models\Ward;
use Illuminate\Support\Facades\DB;

/**
 * RF-110–112: el administrador configura pabellones, habitaciones y camas de su institución.
 * Desactivar oculta la cama de la asignación; borrar es lógico (el historial de asignaciones,
 * limpiezas y solicitudes sigue apuntando a la cama).
 */
class BedInfrastructure
{
    public const MAX_BULK_BEDS = 200;

    private const IN_USE_STATUSES = ['occupied', 'cleaning'];

    /** @return array{wards: list<array<string, mixed>>} */
    public function wards(): array
    {
        $wards = Ward::query()->with(['beds' => fn ($q) => $q->orderBy('room')->orderBy('bed_code')])
            ->orderBy('code')->get();

        return ['wards' => $wards->map(fn (Ward $ward) => $this->presentWard($ward, true))->values()->all()];
    }

    /** @param array<string, mixed> $data */
    public function createWard(array $data, User $actor): array
    {
        return DB::transaction(function () use ($data, $actor) {
            $trashed = Ward::onlyTrashed()->where('code', $data['code'])->first();
            $attributes = ['name' => $data['name'], 'specialty' => $data['specialty'], 'active' => true];
            if ($trashed) {
                $trashed->restore();
                $trashed->update($attributes);
                $ward = $trashed;
            } else {
                $ward = Ward::query()->create(['code' => $data['code']] + $attributes);
            }
            $this->log($actor, 'ward.created', 'ward', $ward->id, ['code' => $ward->code, 'restored' => (bool) $trashed]);

            return $this->presentWard($ward->load('beds'), true);
        });
    }

    /** @param array<string, mixed> $data */
    public function updateWard(int $id, array $data, User $actor): array
    {
        return DB::transaction(function () use ($id, $data, $actor) {
            $ward = Ward::query()->lockForUpdate()->findOrFail($id);
            if (array_key_exists('active', $data) && ! $data['active'] && $ward->active) {
                $this->assertWardFree($ward, 'desactivar');
            }
            $ward->update($data);
            $this->log($actor, 'ward.updated', 'ward', $ward->id, $data);

            return $this->presentWard($ward->load('beds'), true);
        });
    }

    public function deleteWard(int $id, User $actor): void
    {
        DB::transaction(function () use ($id, $actor) {
            $ward = Ward::query()->lockForUpdate()->findOrFail($id);
            $this->assertWardFree($ward, 'borrar');
            $count = $ward->beds()->count();
            $ward->beds()->each(fn (Bed $bed) => $bed->delete());
            $ward->delete();
            $this->log($actor, 'ward.deleted', 'ward', $ward->id, ['code' => $ward->code, 'beds' => $count]);
        });
    }

    /** @param array<string, mixed> $data */
    public function createBed(array $data, User $actor): array
    {
        return DB::transaction(function () use ($data, $actor) {
            $ward = Ward::query()->findOrFail($data['wardId']);
            [$bed, $restored] = $this->insertBed($ward, (string) $data['room'], (string) $data['bedCode'], $data['genderPolicy'], (bool) ($data['isolation'] ?? false));
            if ($bed === null) {
                throw new ClinicalRuleException('Ya existe una cama con esa habitación y código en el pabellón.');
            }
            $this->log($actor, 'bed.created', 'bed', $bed->id, ['room' => $bed->room, 'bedCode' => $bed->bed_code, 'restored' => $restored]);

            return $this->presentBed($bed);
        });
    }

    /** @param array<string, mixed> $data */
    public function updateBed(int $id, array $data, User $actor): array
    {
        return DB::transaction(function () use ($id, $data, $actor) {
            $bed = Bed::query()->lockForUpdate()->findOrFail($id);
            if (array_key_exists('active', $data) && ! $data['active'] && $bed->active) {
                $this->assertBedFree($bed, 'desactivar');
            }
            $bed->update($data);
            $this->log($actor, 'bed.updated', 'bed', $bed->id, $data);

            return $this->presentBed($bed->refresh());
        });
    }

    public function deleteBed(int $id, User $actor): void
    {
        DB::transaction(function () use ($id, $actor) {
            $bed = Bed::query()->lockForUpdate()->findOrFail($id);
            $this->assertBedFree($bed, 'borrar');
            $bed->delete();
            $this->log($actor, 'bed.deleted', 'bed', $bed->id, ['room' => $bed->room, 'bedCode' => $bed->bed_code]);
        });
    }

    /**
     * Vista previa del alta en lote: no escribe nada.
     *
     * @param  array<string, mixed>  $data
     */
    public function previewBulk(array $data): array
    {
        $ward = Ward::query()->findOrFail($data['wardId']);
        $rows = $this->bulkRows($data);
        $existing = Bed::query()->where('ward_id', $ward->id)->get()
            ->map(fn (Bed $bed) => $bed->room.'|'.$bed->bed_code)->flip();

        $beds = array_map(fn (array $row) => $row + ['exists' => $existing->has($row['room'].'|'.$row['bedCode'])], $rows);

        return [
            'total' => count($beds),
            'existing' => count(array_filter($beds, fn (array $bed) => $bed['exists'])),
            'beds' => $beds,
        ];
    }

    /** @param array<string, mixed> $data */
    public function createBulk(array $data, User $actor): array
    {
        return DB::transaction(function () use ($data, $actor) {
            $ward = Ward::query()->findOrFail($data['wardId']);
            $created = 0;
            $skipped = 0;
            foreach ($this->bulkRows($data) as $row) {
                [$bed] = $this->insertBed($ward, $row['room'], $row['bedCode'], $data['genderPolicy'], (bool) ($data['isolation'] ?? false));
                $bed === null ? $skipped++ : $created++;
            }
            $this->log($actor, 'bed.bulk_created', 'ward', $ward->id, [
                'roomFrom' => $data['roomFrom'], 'roomTo' => $data['roomTo'], 'bedsPerRoom' => $data['bedsPerRoom'],
                'created' => $created, 'skipped' => $skipped,
            ]);

            return ['created' => $created, 'skipped' => $skipped];
        });
    }

    /** @return list<array{room: string, bedCode: string, label: string}> */
    private function bulkRows(array $data): array
    {
        $rooms = max(0, (int) $data['roomTo'] - (int) $data['roomFrom'] + 1);
        $perRoom = (int) $data['bedsPerRoom'];
        if ($rooms * $perRoom > self::MAX_BULK_BEDS) {
            throw new ClinicalRuleException('El alta en lote admite hasta '.self::MAX_BULK_BEDS.' camas por operación.');
        }

        $rows = [];
        for ($room = (int) $data['roomFrom']; $room <= (int) $data['roomTo']; $room++) {
            for ($i = 0; $i < $perRoom; $i++) {
                $code = chr(ord('A') + $i);
                $rows[] = ['room' => (string) $room, 'bedCode' => $code, 'label' => $room.'-'.$code];
            }
        }

        return $rows;
    }

    /** @return array{0: ?Bed, 1: bool} cama creada o restaurada; null si ya existía. */
    private function insertBed(Ward $ward, string $room, string $code, string $gender, bool $isolation): array
    {
        $key = ['ward_id' => $ward->id, 'room' => $room, 'bed_code' => $code];
        $found = Bed::withTrashed()->where($key)->first();
        $attributes = ['gender_policy' => $gender, 'isolation' => $isolation, 'status' => 'available', 'active' => true];

        if ($found === null) {
            return [Bed::query()->create($key + $attributes), false];
        }
        if (! $found->trashed()) {
            return [null, false];
        }
        $found->restore();
        $found->update($attributes);

        return [$found, true];
    }

    private function assertBedFree(Bed $bed, string $verb): void
    {
        $inUse = in_array($bed->status, self::IN_USE_STATUSES, true)
            || $bed->assignments()->whereNull('released_at')->exists();
        if ($inUse) {
            throw new ClinicalRuleException("No se puede {$verb} la cama {$bed->room}-{$bed->bed_code}: está ocupada o en limpieza.");
        }
    }

    private function assertWardFree(Ward $ward, string $verb): void
    {
        foreach ($ward->beds as $bed) {
            $this->assertBedFree($bed, $verb);
        }
    }

    private function log(User $actor, string $action, string $type, int $id, array $details): void
    {
        BedInfrastructureChange::query()->create([
            'user_id' => $actor->id, 'action' => $action, 'subject_type' => $type, 'subject_id' => $id, 'details' => $details,
        ]);
    }

    /** @return array<string, mixed> */
    private function presentBed(Bed $bed): array
    {
        return [
            'id' => $bed->id,
            'wardId' => $bed->ward_id,
            'room' => $bed->room,
            'bedCode' => $bed->bed_code,
            'genderPolicy' => $bed->gender_policy,
            'isolation' => (bool) $bed->isolation,
            'status' => $bed->status,
            'active' => (bool) $bed->active,
        ];
    }

    /** @return array<string, mixed> */
    private function presentWard(Ward $ward, bool $withBeds): array
    {
        return [
            'id' => $ward->id,
            'code' => $ward->code,
            'name' => $ward->name,
            'specialty' => $ward->specialty,
            'active' => (bool) $ward->active,
            'beds' => $withBeds ? $ward->beds->map(fn (Bed $bed) => $this->presentBed($bed))->values()->all() : [],
        ];
    }
}
