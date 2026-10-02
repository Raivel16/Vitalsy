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

function deliverableDone(item: DischargeCase, id: string): boolean {
  return item.deliverables.some((deliverable) => deliverable.id === id && deliverable.done);
}

/** Quién debe actuar ahora, en el orden del proceso de alta. */
export function handoffLines(item: DischargeCase): string[] {
  const done = (id: string) => deliverableDone(item, id);
  if (done("exit")) return ["El alta ya cerró. El paciente egresó."];

  const lines: string[] = [];
  if (!done("order")) {
    return ["Sigue el médico tratante o el residente: registrar la orden de alta desde el expediente."];
  }
  if (!done("epicrisis") || !done("prescriptions")) {
    lines.push("Sigue el médico residente: epicrisis y receta ambulatoria.");
  }
  if (!done("social")) {
    lines.push("En paralelo, trabajo social registra la valoración.");
  }
  if (!done("reconciliation") || !done("nursing") || !done("receipt")) {
    lines.push("En paralelo, la enfermera de piso concilia la medicación, redacta el informe y confirma la recepción.");
  }
  const readyForDesk = done("epicrisis") && done("prescriptions") && done("social") && done("reconciliation") && done("nursing") && done("receipt");
  if (readyForDesk && !done("account")) lines.push("Sigue Altas y caja: verificar la liquidación.");
  if (readyForDesk && done("account") && !done("pass")) lines.push("Sigue Altas y caja: emitir el pase de salida.");
  if (done("pass") && !done("exit")) {
    lines.push("Sigue el camillero: trasladar al paciente. La salida efectiva la registra solo la enfermera de piso.");
  }
  return lines;
}

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
  transfer: "Trasladar al paciente",
  await_exit: "La enfermera de piso confirma la salida",
  exit: "Registrar salida efectiva",
};
