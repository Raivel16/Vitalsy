import type { Role } from "../../../app/roles";

export type Deliverable = {
  id: string;
  label: string;
  done: boolean;
};

export type Encounter = {
  encounterId: string;
  orderNumber: string;
  transferOrderNumber: string | null;
  patientName: string;
  documentType: string;
  documentNumber: string;
  originService: string;
  coverage: { payer: string; status: string; plan: string };
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
