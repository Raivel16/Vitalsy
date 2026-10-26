import type { GenderPolicy } from "./domain/infrastructureForm";

export type InfraBed = {
  id: number;
  wardId: number;
  room: string;
  bedCode: string;
  genderPolicy: GenderPolicy;
  isolation: boolean;
  status: string;
  active: boolean;
};

export type InfraWard = {
  id: number;
  code: string;
  name: string;
  specialty: string;
  active: boolean;
  beds: InfraBed[];
};

export type BulkPreview = {
  total: number;
  existing: number;
  beds: Array<{ room: string; bedCode: string; label: string; exists: boolean }>;
};
