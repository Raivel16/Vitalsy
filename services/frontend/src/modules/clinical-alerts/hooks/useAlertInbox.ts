import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../../app/api";
import type { ClinicalAlert } from "../domain/alert";

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
 *
 * El despacho en menos de 2 segundos (RNF-01) requiere WebSockets y queda
 * pendiente; al llegar, solo cambia la fuente que alimenta este estado.
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
      // Una consulta fallida no debe interrumpir el trabajo del turno; el
      // siguiente ciclo lo reintenta.
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
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      activeRef.current = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [pollingEnabled, refresh]);

  const acknowledge = useCallback(async (alertId: number) => {
    await api(`/api/v1/clinical-alerts/${alertId}/acknowledge`, { method: "POST" });
    await refresh();
  }, [refresh]);

  return { alerts, pending: alerts.length, acknowledge, refresh };
}
