export type StaffMember = { id: number; name: string; email?: string | null; role: string; isActive: boolean };

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

export type HandoverCandidate = {
  userId: number;
  name: string;
  unit: string;
  endsAt: string;
  patients: number;
};

export type PlannedShift = {
  userId: number;
  userName?: string | null;
  userRole?: string | null;
  startsAt: string;
  endsAt: string;
  unit: string | null;
};

export type PublishedPlan = {
  yearMonth: string;
  publishedAt: string | null;
  publishedByName: string | null;
  shifts: PlannedShift[];
  retainers: Array<{ userId: number; userName?: string | null; date: string }>;
};

export type PlanSummary = {
  yearMonth: string;
  publishedAt: string | null;
  publishedByName: string | null;
  shiftCount: number;
  staffCount: number;
};
