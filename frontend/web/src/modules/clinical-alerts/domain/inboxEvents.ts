/** Evento de ventana para sincronizar campana, toast y bandeja al confirmar lectura. */
export const ALERT_ACKNOWLEDGED_EVENT = "vitalsy-alert-acknowledged";

export function notifyAlertAcknowledged(alertId: number): void {
  window.dispatchEvent(new CustomEvent(ALERT_ACKNOWLEDGED_EVENT, { detail: { alertId } }));
}
