import type { Role } from "../../../app/roles";

export type StaffCapabilities = {
  publishRoster: boolean;
  assign: boolean;
  recordAbsence: boolean;
  handover: boolean;
  viewCoverage: boolean;
  approveCoverage: boolean;
  authorizeCoverage: boolean;
  confirmRetainer: boolean;
};

const NONE: StaffCapabilities = {
  publishRoster: false,
  assign: false,
  recordAbsence: false,
  handover: false,
  viewCoverage: false,
  approveCoverage: false,
  authorizeCoverage: false,
  confirmRetainer: false,
};

/** Qué puede hacer cada perfil en /personal; espeja los grupos `role:` del backend. */
export function capabilitiesFor(role: Role): StaffCapabilities {
  switch (role) {
    case "jefatura_enfermeria":
      return { ...NONE, publishRoster: true, viewCoverage: true, approveCoverage: true };
    case "enfermera_supervisora":
      return { ...NONE, assign: true, recordAbsence: true, viewCoverage: true, confirmRetainer: true };
    case "recursos_humanos":
      return { ...NONE, viewCoverage: true, authorizeCoverage: true };
    case "enfermera_piso":
      return { ...NONE, handover: true };
    default:
      return { ...NONE };
  }
}
