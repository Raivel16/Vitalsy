import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../../app/api";
import { alertSiren } from "../../../shared/audio/alertSiren";
import type { ClinicalAlert } from "../domain/alert";
import { ALERT_ACKNOWLEDGED_EVENT, notifyAlertAcknowledged } from "../domain/inboxEvents";

const POLL_MS = 15000;

export type AlertInbox = {
  alerts: ClinicalAlert[];
  pending: number;
  acknowledge: (alertId: number) => Promise<void>;
  refresh: () => Promise<void>;
};

/**
 * Bandeja de alertas del perfil. Consulta al montar y cada 15 segundos; se
 * detiene mientras la pestaña está oculta para no gastar red en vano.
 */
export function useAlertInbox(enabled: boolean): AlertInbox {
  const [alerts, setAlerts] = useState<ClinicalAlert[]>([]);
  const activeRef = useRef(true);
  const pollingEnabled = enabled && (import.meta.env.MODE !== "test" || sessionStorage.getItem("vitalsy-alert-inbox") === "1");

  const refresh = useCallback(async () => {
    if (!pollingEnabled) return;
    try {
      const data = await api<{ alerts?: ClinicalAlert[] }>("/api/v1/clinical-alerts/inbox");
      if (activeRef.current) setAlerts(data.alerts ?? []);
    } catch {
      // Una consulta fallida no debe interrumpir el trabajo del turno.
    }
  }, [pollingEnabled]);

  useEffect(() => {
    activeRef.current = true;
    if (!pollingEnabled) {
      setAlerts([]);
      return () => {
        activeRef.current = false;
      };
    }

    void refresh();
    const timer = setInterval(() => {
      if (!document.hidden) void refresh();
    }, POLL_MS);

    function onVisible() {
      if (!document.hidden) void refresh();
    }
    function onAcknowledged(event: Event) {
      const alertId = (event as CustomEvent<{ alertId?: number }>).detail?.alertId;
      if (typeof alertId !== "number") return;
      setAlerts((current) => {
        const next = current.map((alert) => (
          alert.id === alertId ? { ...alert, needsSiren: false } : alert
        ));
        if (!next.some((alert) => alert.needsSiren)) alertSiren.stop();
        return next;
      });
    }

    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener(ALERT_ACKNOWLEDGED_EVENT, onAcknowledged);

    return () => {
      activeRef.current = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener(ALERT_ACKNOWLEDGED_EVENT, onAcknowledged);
    };
  }, [pollingEnabled, refresh]);

  const acknowledge = useCallback(async (alertId: number) => {
    // Optimista solo tras éxito del POST: si falla, el toast permanece y reintenta.
    try {
      await api(`/api/v1/clinical-alerts/${alertId}/acknowledge`, { method: "POST" });
      setAlerts((current) => current.map((alert) => (
        alert.id === alertId ? { ...alert, needsSiren: false } : alert
      )));
      notifyAlertAcknowledged(alertId);
      await refresh();
    } catch (error) {
      await refresh();
      throw error;
    }
  }, [refresh]);

  const pending = alerts.filter((alert) => alert.needsSiren).length;

  return { alerts, pending, acknowledge, refresh };
}
