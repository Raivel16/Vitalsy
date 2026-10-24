import { ApiError } from "../api";
import type { Ctx } from "./types";

// RNF-18: solicitudes y asignaciones de cama del módulo 5 por API.

export type BedRequestInput = {
  encounterId?: string;
  patientName?: string;
  specialty: string;
  gender: "male" | "female";
  isolationType: "ninguno" | "gotas" | "contacto" | "respiratorio";
  priority: "critica" | "alta" | "media" | "baja";
  source: "urgencias" | "quirofano" | "admisiones";
};

export type ApiBed = {
  id: number;
  ward: string | null;
  room: string;
  bedCode: string;
  genderPolicy: "mixed" | "male" | "female";
  isolation: boolean;
  status: string;
};

export async function requestBed(ctx: Ctx, input: BedRequestInput): Promise<{ requestId: number; suggestions: ApiBed[] }> {
  const res = await (await ctx.api("gestion_camas")).post<{ request: { id: number }; suggestions: ApiBed[] }>("/beds/requests", {
    ...input,
    isolation: input.isolationType !== "ninguno",
  });
  return ctx.data.track(`solicitud de cama ${res.request.id}`, { requestId: res.request.id, suggestions: res.suggestions });
}

export async function suggestionsFor(ctx: Ctx, requestId: number): Promise<ApiBed[]> {
  return (await (await ctx.api("gestion_camas")).get<{ suggestions: ApiBed[] }>(`/beds/requests/${requestId}/suggestions`)).suggestions;
}

/**
 * Asigna `bedId` o una sugerencia al azar. Las pruebas paralelas pueden competir por el
 * mismo lecho: ante un 422 se reintenta con otra sugerencia.
 */
export async function assignBed(ctx: Ctx, requestId: number, bedId?: number) {
  const api = await ctx.api("gestion_camas");
  for (let attempt = 0; ; attempt++) {
    const chosen = bedId ?? ctx.data.pick(await suggestionsFor(ctx, requestId)).id;
    try {
      const { assignment } = await api.post<{ assignment: { id: number; bedId: number } }>(`/beds/requests/${requestId}/assign`, { bedId: chosen });
      const bed = (await bedsWhere(ctx, (b) => b.id === assignment.bedId))[0];
      return ctx.data.track(`asignación ${assignment.id}`, { assignmentId: assignment.id, bedId: assignment.bedId, room: bed.room, bedCode: bed.bedCode, ward: bed.ward });
    } catch (error) {
      if (bedId !== undefined || attempt >= 3 || !(error instanceof ApiError) || error.status !== 422) throw error;
    }
  }
}

type CensusWard = { id: number; code: string; name: string; specialty: string; beds: (ApiBed & { occupant: unknown })[] };

export async function census(ctx: Ctx): Promise<CensusWard[]> {
  return (await (await ctx.api("gestion_camas")).get<{ wards: CensusWard[] }>("/beds/census")).wards;
}

export async function bedsWhere(ctx: Ctx, match: (bed: ApiBed, ward: CensusWard) => boolean): Promise<(ApiBed & { wardCode: string })[]> {
  return (await census(ctx)).flatMap((w) => w.beds.filter((b) => match(b, w)).map((b) => ({ ...b, wardCode: w.code })));
}

export async function bedsOf(ctx: Ctx, wardCode: string) {
  return bedsWhere(ctx, (_, w) => w.code === wardCode);
}
