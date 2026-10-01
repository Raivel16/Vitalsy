import type { Role } from "../../../app/roles";

export type Deliverable = {
  id: string;
  label: string;
  done: boolean;
};

export type ProgressStep = {
  id: string;
  label: string;
  state: "done" | "current" | "pending";
};

export type CoverageReferral = {
  destination: string;
  destinationLabel: string;
  status: string;
  relativeName: string;
  relativePhone?: string | null;
  note?: string | null;
  registeredAt?: string | null;
};

export type Encounter = {
  encounterId: string;
  orderNumber: string;
  source?: string;
  transferOrderNumber: string | null;
  patientName: string;
  documentType: string;
  documentNumber: string;
  originService: string;
  coverage: { payer: string; status: string; plan: string };
  coverageReferral?: CoverageReferral | null;
  clinical?: {
    filiation?: { fullName?: string; documentNumber?: string; birthDate?: string; confirmed?: boolean } | null;
    consent?: { signerName?: string; relationship?: string | null } | null;
  };
  location: { room: string | null; bed: string | null; service: string | null };
  wristbandCode: string | null;
  recordId: string | null;
  subprocess: string;
  subprocessLabel: string;
  currentStep: string;
  currentStepLabel: string;
  nextRole: Role | null;
  statusLabel: string;
  deliverables: Deliverable[];
  progress?: ProgressStep[];
};

export function locationText(encounter: Encounter): string {
  const { room, bed, service } = encounter.location;
  if (!room && !bed) return "Sin ubicación";
  return [room ? `Habitación ${room}` : null, bed ? `lecho ${bed}` : null, service].filter(Boolean).join(", ");
}

export function deliverableCount(encounter: Encounter): string {
  const done = encounter.deliverables.filter((item) => item.done).length;
  return `${done} de ${encounter.deliverables.length} entregables listos`;
}
