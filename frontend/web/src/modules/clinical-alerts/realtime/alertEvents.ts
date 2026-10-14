/**
 * Nombres de evento y de canal de alertas en tiempo real. Deben coincidir con
 * `broadcastAs()` de ClinicalAlertRaised/ClinicalAlertUpdated en el backend
 * (hay una prueba que lo verifica). El punto inicial evita el prefijo de
 * namespace de Echo.
 */
export const ALERT_RAISED_EVENT = "alert.raised";
export const ALERT_UPDATED_EVENT = "alert.updated";

export const alertChannelName = (userId: number) => `alerts.${userId}`;
