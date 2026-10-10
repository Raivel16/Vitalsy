export type StaffMember = { id: number; name: string; role: string; isActive: boolean };

export type CoverageRequest = {
  id: number;
  absenceId: number | null;
  status: string;
  absentUserId: number | null;
  absentName: string | null;
  shiftDate: string | null;
  reason: string | null;
  approvedByName: string | null;
  authorizedByName: string | null;
  retainerName: string | null;
};

export type ProposedAssignment = {
  nurseUserId: number;
  encounterId: string;
  patientName?: string | null;
  news2Weight: number;
};

export type NurseLoad = { nurseId: number; name: string; weight: number; patients: number };

export type AbsenceResult = {
  absence: { id: number };
  coverage: { required: boolean; requestId: number | null };
  reassignments: Array<{ nurseUserId: number; nurseName: string; patients: number }>;
  unassigned: number;
};

export type HandoverPatient = {
  encounterId: string;
  patientName: string | null;
  news2: number | null;
  alerts: Array<{ id: number; message: string; status: string }>;
  pendingDoses: number;
};

export type HandoverSummary = {
  shiftDate: string;
  fromUserId: number;
  fromName: string;
  patients: HandoverPatient[];
};

export type PlannedShift = { userId: number; startsAt: string; endsAt: string; unit: string | null };
