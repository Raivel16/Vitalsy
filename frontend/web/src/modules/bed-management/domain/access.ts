/** Qué puede ver y hacer cada rol en `/camas` (espejo de `routes/api.php`, grupo `beds`). */
export type BedCapabilities = {
  canRequest: boolean;
  canAssign: boolean;
  seesWaitingList: boolean;
  seesProjections: boolean;
  canProject: boolean;
  seesNotifications: boolean;
  tracksEnablement: boolean;
};

export function capabilitiesFor(role: string): BedCapabilities {
  const management = role === "gestion_camas";
  const supervisor = role === "enfermera_supervisora";
  return {
    canRequest: management,
    canAssign: management,
    seesWaitingList: management || supervisor,
    seesProjections: management || supervisor,
    canProject: supervisor,
    seesNotifications: supervisor,
    tracksEnablement: supervisor,
  };
}
