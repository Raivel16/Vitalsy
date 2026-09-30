export type DischargeDeliverable = {
  id: string;
  label: string;
  done: boolean;
};

export type DischargeCase = {
  encounterId: string;
  patientName: string;
  location: string | null;
  nextAction: string | null;
  deliverables: DischargeDeliverable[];
  order: { status: string; orderedAt: string | null } | null;
  epicrisis: { diagnoses: string; procedures: string | null; evolution: string | null } | null;
  prescriptions: { items: Array<{ drug: string; dose: string; route: string; frequency: string; days: number }>; issuedAt: string | null } | null;
  socialAssessment: { report: string; validated: boolean } | null;
  reconciliation: { notes: string | null; status: string } | null;
  nursingReport: { instructions: string; alarmSigns: string | null; homeCare: string | null } | null;
  indicationReceipt: { receivedByName: string; receivedAt: string | null } | null;
  account: { status: string; verifiedAt: string | null } | null;
  exitPass: { status: string; issuedAt: string | null } | null;
  exit: { confirmed: boolean; exitedAt: string | null } | null;
};

export const ACTION_LABEL: Record<string, string> = {
  order: "Registrar orden de alta",
  epicrisis: "Elaborar epicrisis",
  prescriptions: "Emitir recetas ambulatorias",
  social: "Registrar valoración social",
  reconciliation: "Conciliar medicación al alta",
  nursing: "Generar informe de enfermería",
  receipt: "Confirmar recepción de indicaciones",
  account: "Verificar estado de cuenta",
  pass: "Emitir pase de salida",
  transfer: "Consultar autorización de salida",
  exit: "Registrar salida efectiva",
};
