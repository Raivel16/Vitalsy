import type { Checklist } from "./domain/cleaningStage";

export type Bed = {
  id: number;
  ward: string | null;
  room: string;
  bedCode: string;
  genderPolicy?: string | null;
  isolation: boolean;
  status: string;
  occupant?: { encounterId: string; patientName: string | null; since: string | null } | null;
};

export type WardCensus = {
  id?: number;
  code: string;
  name: string;
  specialty?: string | null;
  available: number;
  occupied: number;
  cleaning: number;
  beds: Bed[];
};

export type BedRequest = {
  id: number;
  encounterId?: string | null;
  patientName: string | null;
  source?: string;
  priority: string;
  specialty?: string | null;
  gender?: string | null;
  isolation: boolean;
  isolationType?: string | null;
  equipment?: string[];
  status: string;
  requestedAt?: string | null;
};

export type CleaningOrder = {
  id: number;
  bedId: number;
  room: string | null;
  bedCode: string | null;
  ward?: string | null;
  isolation?: boolean;
  protocol: string;
  status: string;
  checklist?: Partial<Checklist>;
  dispatchedAt?: string | null;
  completedAt?: string | null;
  equippedAt?: string | null;
  enabledAt?: string | null;
};

export type PatientOption = {
  encounterId: string;
  patientName: string;
  documentNumber: string;
  originService?: string | null;
  gender: "female" | "male" | null;
};

export type Projection = {
  id: number;
  encounterId: string;
  patientName: string | null;
  projectedAt: string | null;
};

export type AssignmentNotification = {
  id: number;
  encounterId: string;
  patientName: string | null;
  ward: string | null;
  room: string | null;
  bedCode: string | null;
  assignedAt: string | null;
};

export type RequestPayload = {
  source: string;
  priority: string;
  encounterId?: string;
  patientName?: string;
  specialty?: string;
  gender?: "female" | "male";
  isolationType: string;
  equipment: string[];
};
