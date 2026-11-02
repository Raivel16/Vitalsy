import type { ClinicalAlert } from "./alert";

/** Evento de ventana para sincronizar campana, toast y bandeja al confirmar lectura. */
export const ALERT_ACKNOWLEDGED_EVENT = "vitalsy-alert-acknowledged";

export function notifyAlertAcknowledged(alertId: number): void {
  window.dispatchEvent(new CustomEvent(ALERT_ACKNOWLEDGED_EVENT, { detail: { alertId } }));
}

/** Evento de ventana para que las páginas abiertas sigan los cambios de la bandeja sin recargar. */
export const ALERT_INBOX_CHANGED_EVENT = "vitalsy-alert-inbox-changed";

export function notifyAlertInboxChanged(alerts: ClinicalAlert[]): void {
  window.dispatchEvent(new CustomEvent(ALERT_INBOX_CHANGED_EVENT, { detail: { alerts } }));
}
