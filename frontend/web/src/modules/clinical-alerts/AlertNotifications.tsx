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

function toastKicker(alert: ClinicalAlert): string {
  if (alert.status === "en_atencion") return "Seguimiento vencido · reevalúe al paciente";
  if (alert.status === "medico_notificado") return "Atención médica solicitada";
  return "Alerta clínica";
}

/**
 * RF-53: campana en la cabecera, avisos emergentes y señal sonora.
 *
 * Confirmar lectura calla la sirena; el toast ofrece ir al evento o cerrar.
 * La alerta permanece en la bandeja hasta disponer. A los 15 min sin atención
 * `needsSiren` vuelve a true y sirena/toast reaparecen.
 */
async function confirmRead(
  alertId: number,
  confirming: Set<number>,
  announced: Set<number>,
  acknowledge: (alertId: number) => Promise<void>,
) {
  confirming.add(alertId);
  alertSiren.stop();
  try {
    await acknowledge(alertId);
    announced.delete(alertId);
  } finally {
    confirming.delete(alertId);
  }
}

function releaseSirenTracking(announced: Set<number>, confirming: Set<number>, alerts: ClinicalAlert[]) {
  for (const id of announced) {
    if (confirming.has(id)) continue;
    const alert = alerts.find((item) => item.id === id);
    if (!alert?.needsSiren) {
      announced.delete(id);
    }
  }
}

export function AlertNotifications({ enabled, userId }: Readonly<{ enabled: boolean; userId?: number | null }>) {
  const { alerts, acknowledge } = useAlertInbox(enabled, { userId });
  const { push, dismiss, clear } = useToast();
  const announced = useRef<Set<number>>(new Set());
  const confirming = useRef<Set<number>>(new Set());
  const toastAlertIds = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!enabled) {
      announced.current.clear();
      confirming.current.clear();
      toastAlertIds.current.clear();
      clear();
      alertSiren.stop();
      return;
    }

    const sirenAlerts = alerts.filter((alert) => alert.needsSiren);
    const inboxIds = new Set(alerts.map((alert) => alert.id));

    for (const alert of sirenAlerts) {
      if (announced.current.has(alert.id) || confirming.current.has(alert.id)) continue;
      announced.current.add(alert.id);
      toastAlertIds.current.add(alert.id);

      push({
        id: `alerta-${alert.id}`,
        tone: severityVisual(alert.severity) === "red" ? "critical" : "info",
        kicker: toastKicker(alert),
        title: alert.patientName ?? alert.encounterId,
        body: toastBody(alert),
        note: alert.location ?? undefined,
        confirmLabel: "Confirmar lectura",
        followUpHref: `/alertas/${alert.id}`,
        followUpLabel: "Ir al evento",
        dismissLabel: "Cerrar",
        onConfirm: () => confirmRead(alert.id, confirming.current, announced.current, acknowledge),
      });
    }

    // Liberar tracking de sirena; el toast de follow-up lo cierra el usuario.
    releaseSirenTracking(announced.current, confirming.current, alerts);

    // Si la alerta salió del inbox (cerrada), retirar el aviso.
    for (const id of toastAlertIds.current) {
      if (inboxIds.has(id)) continue;
      toastAlertIds.current.delete(id);
      announced.current.delete(id);
      dismiss(`alerta-${id}`);
    }

    const audible = sirenAlerts.some((alert) => !confirming.current.has(alert.id));
    if (audible) {
      alertSiren.start();
    } else {
      alertSiren.stop();
    }
  }, [acknowledge, alerts, clear, dismiss, enabled, push]);

  useEffect(() => () => alertSiren.stop(), []);

  if (!enabled) return null;

  return <AlertBell alerts={alerts} />;
}
