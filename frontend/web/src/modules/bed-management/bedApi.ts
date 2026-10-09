import { api } from "../../app/api";
import type { Checklist } from "./domain/cleaningStage";
import type {
  AssignmentNotification,
  Bed,
  BedRequest,
  CleaningOrder,
  PatientOption,
  Projection,
  RequestPayload,
  WardCensus,
} from "./types";

const base = "/api/v1/beds";

function post<T>(path: string, body?: unknown) {
  return api<T>(`${base}${path}`, { method: "POST", ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}

/** Única puerta de entrada HTTP del módulo de camas: facilita sustituirla en pruebas. */
export const bedApi = {
  census: () => api<{ wards: WardCensus[] }>(`${base}/census`),
  requests: (status?: string) => api<{ requests: BedRequest[] }>(`${base}/requests${status ? `?status=${status}` : ""}`),
  suggestions: (requestId: number) => api<{ suggestions: Bed[] }>(`${base}/requests/${requestId}/suggestions`),
  createRequest: (payload: RequestPayload) => post<{ request: BedRequest; suggestions: Bed[] }>("/requests", payload),
  assign: (requestId: number, bedId: number) => post<{ assignment: { id: number; bedId: number } }>(`/requests/${requestId}/assign`, { bedId }),
  patients: (query = "") => api<{ patients: PatientOption[] }>(`${base}/patients${query ? `?query=${encodeURIComponent(query)}` : ""}`),
  projections: () => api<{ projections: Projection[] }>(`${base}/projections`),
  createProjection: (encounterId: string, projectedAt: string) => post<{ projection: Projection }>("/projections", { encounterId, projectedAt }),
  notifications: () => api<{ notifications: AssignmentNotification[] }>(`${base}/assignments/notifications`),
  acknowledge: (assignmentId: number) => post<{ acknowledged: boolean }>(`/assignments/${assignmentId}/acknowledge`),
  cleaningOrders: () => api<{ orders: CleaningOrder[] }>(`${base}/cleaning-orders`),
  completeCleaning: (orderId: number, checklist: Checklist) => post<{ order: CleaningOrder }>(`/cleaning-orders/${orderId}/complete`, { checklist }),
  equip: (bedId: number) => post<{ order: CleaningOrder }>(`/${bedId}/equip`),
  release: (bedId: number) => post<{ order: CleaningOrder }>(`/${bedId}/release`),
};
