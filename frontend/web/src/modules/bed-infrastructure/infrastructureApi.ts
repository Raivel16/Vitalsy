import { api } from "../../app/api";
import type { BedFormValues, BulkFormValues, GenderPolicy, WardFormValues } from "./domain/infrastructureForm";
import type { BulkPreview, InfraBed, InfraWard } from "./types";

const BASE = "/api/v1/bed-infrastructure";

const json = (method: string, body?: unknown): RequestInit => ({ method, body: body === undefined ? undefined : JSON.stringify(body) });

function bulkBody(values: BulkFormValues) {
  return {
    wardId: Number(values.wardId),
    roomFrom: Number(values.roomFrom),
    roomTo: Number(values.roomTo),
    bedsPerRoom: Number(values.bedsPerRoom),
    genderPolicy: values.genderPolicy,
    isolation: values.isolation,
  };
}

export const listWards = () => api<{ wards: InfraWard[] }>(`${BASE}/wards`);
export const createWard = (values: WardFormValues) =>
  api<{ ward: InfraWard }>(`${BASE}/wards`, json("POST", { ...values, code: values.code.trim(), name: values.name.trim() }));
export const setWardActive = (id: number, active: boolean) => api<{ ward: InfraWard }>(`${BASE}/wards/${id}`, json("PATCH", { active }));
export const deleteWard = (id: number) => api<{ deleted: boolean }>(`${BASE}/wards/${id}`, json("DELETE"));

export const createBed = (values: BedFormValues) =>
  api<{ bed: InfraBed }>(`${BASE}/beds`, json("POST", { ...values, wardId: Number(values.wardId), room: values.room.trim(), bedCode: values.bedCode.trim() }));
export const setBedActive = (id: number, active: boolean) => api<{ bed: InfraBed }>(`${BASE}/beds/${id}`, json("PATCH", { active }));
export const updateBedPolicy = (id: number, genderPolicy: GenderPolicy, isolation: boolean) =>
  api<{ bed: InfraBed }>(`${BASE}/beds/${id}`, json("PATCH", { genderPolicy, isolation }));
export const deleteBed = (id: number) => api<{ deleted: boolean }>(`${BASE}/beds/${id}`, json("DELETE"));

export const previewBulk = (values: BulkFormValues) => api<BulkPreview>(`${BASE}/beds/bulk/preview`, json("POST", bulkBody(values)));
export const createBulk = (values: BulkFormValues) => api<{ created: number; skipped: number }>(`${BASE}/beds/bulk`, json("POST", bulkBody(values)));
