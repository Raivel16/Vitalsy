import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../../app/api";
import { alertSiren } from "../../../shared/audio/alertSiren";
import type { ClinicalAlert } from "../domain/alert";
import { ALERT_ACKNOWLEDGED_EVENT, notifyAlertAcknowledged } from "../domain/inboxEvents";
import { createEchoClient, type RealtimeClient } from "../realtime/realtimeClient";

/** Sondeo sin canal en tiempo real, o con el canal caído. */
const POLL_MS = 15000;
/** Sondeo de respaldo mientras el canal en tiempo real está conectado. */
const POLL_CONNECTED_MS = 60000;
/**
 * RNF-12: reintentos de conexión con espera creciente y tope de 5 s (1 s, 2 s, 4 s, 5 s, 5 s...);
 * se reinicia al conectar o al volver la señal (`online`).
 */
export const RECONNECT_STEPS_MS = [1000, 2000, 4000, 5000] as const;

export type AlertInboxOptions = {
  /** Id del usuario autenticado: define el canal privado `alerts.{userId}`. */
  userId?: number | null;
  /** Transporte en tiempo real inyectable (pruebas). Por defecto Echo/Reverb fuera de test. */
  client?: RealtimeClient | null;
};

let defaultClient: RealtimeClient | null = null;
function sharedEchoClient(): RealtimeClient {
  defaultClient ??= createEchoClient();
  return defaultClient;
}

function resolveClient(options: AlertInboxOptions): RealtimeClient | null {
  if (options.client !== undefined) return options.client;
  return import.meta.env.MODE === "test" ? null : sharedEchoClient();
}

export type AlertInbox = {
  alerts: ClinicalAlert[];
  pending: number;
  acknowledge: (alertId: number) => Promise<void>;
  refresh: () => Promise<void>;
};

/**
 * Bandeja de alertas del perfil (RF-53). Con canal en tiempo real (RNF-01) se
 * refresca al instante en cada evento y sondea cada 60 s como respaldo; sin
 * canal o caído sondea cada 15 s y reintenta conectar (RNF-12), haciendo un
 * refresh completo al reconectar. La API es siempre la fuente de verdad.
 * El sondeo se detiene mientras la pestaña está oculta.
 */
export function useAlertInbox(enabled: boolean, options: AlertInboxOptions = {}): AlertInbox {
  const [alerts, setAlerts] = useState<ClinicalAlert[]>([]);
  const [connected, setConnected] = useState(false);
  const activeRef = useRef(true);
  const connectedRef = useRef(false);
  const lastRefreshRef = useRef(0);
  const pollingEnabled = enabled && (import.meta.env.MODE !== "test" || sessionStorage.getItem("vitalsy-alert-inbox") === "1");
  const userId = options.userId ?? null;
  const client = resolveClient(options);
  const realtime = pollingEnabled && userId !== null && client !== null ? client : null;

  const refresh = useCallback(async () => {
    if (!pollingEnabled) return;
    lastRefreshRef.current = Date.now();
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
    // Un único temporizador de 15 s; con el canal conectado solo consulta si pasaron 60 s (respaldo).
    const timer = setInterval(() => {
      if (document.hidden) return;
      const live = realtime !== null && connectedRef.current;
      if (live && Date.now() - lastRefreshRef.current < POLL_CONNECTED_MS - 1000) return;
      void refresh();
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
  }, [pollingEnabled, realtime, refresh]);

  // Suscripción al canal privado: evento -> refresh inmediato; (re)conexión -> refresh completo.
  useEffect(() => {
    if (!realtime || userId === null) return;
    const unsubscribe = realtime.subscribe(userId, {
      onAlert: () => void refresh(),
      onConnected: () => {
        connectedRef.current = true;
        setConnected(true);
        void refresh();
      },
      onDisconnected: () => {
        connectedRef.current = false;
        setConnected(false);
      },
    });

    return () => {
      unsubscribe();
      connectedRef.current = false;
      setConnected(false);
    };
  }, [realtime, userId, refresh]);

  // RNF-12: mientras el canal esté caído, reintenta cada pocos segundos y al volver la señal.
  useEffect(() => {
    if (!realtime || connected) return;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      const delay = RECONNECT_STEPS_MS[Math.min(attempt, RECONNECT_STEPS_MS.length - 1)];
      timer = setTimeout(() => {
        attempt += 1;
        realtime.reconnect();
        schedule();
      }, delay);
    };
    const onOnline = () => {
      realtime.reconnect();
      attempt = 0;
      clearTimeout(timer);
      schedule();
    };
    schedule();
    window.addEventListener("online", onOnline);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", onOnline);
    };
  }, [realtime, connected]);

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
