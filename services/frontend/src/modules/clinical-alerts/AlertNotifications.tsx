import { useEffect, useRef } from "react";
import { alertSiren } from "../../shared/audio/alertSiren";
import { useToast } from "../../shared/ui/toast/ToastProvider";
import { AlertBell } from "./components/AlertBell";
import { useAlertInbox } from "./hooks/useAlertInbox";
import { severityVisual, type ClinicalAlert } from "./domain/alert";

function toastBody(alert: ClinicalAlert): string {
  const score = alert.news2Total !== null ? `NEWS2 ${alert.news2Total}. ` : "";
  return `${score}${alert.message}`;
}

/**
 * RF-94: campana en la cabecera, avisos emergentes al iniciar sesión y señal
 * sonora que solo cesa cuando el usuario confirma la lectura.
 *
 * Confirmar la lectura equivale al acuse de recibo de RF-39 y RF-42: además de
 * retirar el aviso, detiene el control de tiempo de la alerta.
 */
export function AlertNotifications({ enabled }: { enabled: boolean }) {
  const { alerts, acknowledge } = useAlertInbox(enabled);
  const { push, dismiss, clear } = useToast();
  const announced = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!enabled) {
      announced.current.clear();
      clear();
      alertSiren.stop();
      return;
    }

    for (const alert of alerts) {
      if (announced.current.has(alert.id)) continue;
      announced.current.add(alert.id);

      push({
        id: `alerta-${alert.id}`,
        tone: severityVisual(alert.severity) === "red" ? "critical" : "info",
        title: alert.patientName ?? alert.encounterId,
        body: toastBody(alert),
        note: alert.location ?? undefined,
        confirmLabel: "Confirmar lectura",
        onConfirm: () => acknowledge(alert.id).catch(() => undefined),
      });
    }

    // Los avisos de alertas ya resueltas por otra vía se retiran solos.
    const live = new Set(alerts.map((alert) => alert.id));
    for (const id of announced.current) {
      if (!live.has(id)) {
        announced.current.delete(id);
        dismiss(`alerta-${id}`);
      }
    }

    if (alerts.length > 0) {
      alertSiren.start();
    } else {
      alertSiren.stop();
    }
  }, [acknowledge, alerts, clear, dismiss, enabled, push]);

  useEffect(() => () => alertSiren.stop(), []);

  if (!enabled) return null;

  return <AlertBell alerts={alerts} />;
}
