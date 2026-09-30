import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router";

export type Toast = {
  id: string;
  /** `critical` exige confirmación explícita; no se cierra por tiempo. */
  tone: "critical" | "info";
  title: string;
  body: string;
  confirmLabel: string;
  /** Debe resolver con éxito para retirar el aviso; si lanza, el toast permanece. */
  onConfirm: () => void | Promise<void>;
  note?: string;
  kicker?: string;
  /** Tras confirmar lectura con éxito, enlace al detalle del evento. */
  followUpHref?: string;
  followUpLabel?: string;
  dismissLabel?: string;
};

type ToastState = {
  toasts: Toast[];
  push: (toast: Toast) => void;
  dismiss: (id: string) => void;
  clear: () => void;
};

const ToastContext = createContext<ToastState | null>(null);

/**
 * Avisos emergentes propios. No hay cierre automático por tiempo (RF-53).
 * Tras confirmar lectura, si hay follow-up, el aviso ofrece ir al evento o cerrar.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorById, setErrorById] = useState<Record<string, string>>({});
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(() => new Set());

  const push = useCallback((toast: Toast) => {
    setToasts((current) => (current.some((item) => item.id === toast.id) ? current : [...current, toast]));
    setAcknowledgedIds((current) => {
      if (!current.has(toast.id)) return current;
      const next = new Set(current);
      next.delete(toast.id);
      return next;
    });
    setErrorById((current) => {
      if (!(toast.id in current)) return current;
      const next = { ...current };
      delete next[toast.id];
      return next;
    });
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
    setAcknowledgedIds((current) => {
      if (!current.has(id)) return current;
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    setErrorById((current) => {
      if (!(id in current)) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setToasts([]);
    setErrorById({});
    setBusyId(null);
    setAcknowledgedIds(new Set());
  }, []);

  const confirm = useCallback(async (toast: Toast) => {
    if (busyId === toast.id) return;
    setBusyId(toast.id);
    setErrorById((current) => {
      if (!(toast.id in current)) return current;
      const next = { ...current };
      delete next[toast.id];
      return next;
    });
    try {
      await toast.onConfirm();
      if (toast.followUpHref) {
        setAcknowledgedIds((current) => new Set(current).add(toast.id));
      } else {
        dismiss(toast.id);
      }
    } catch {
      setErrorById((current) => ({
        ...current,
        [toast.id]: "No se pudo confirmar la lectura. Intente de nuevo.",
      }));
    } finally {
      setBusyId((current) => (current === toast.id ? null : current));
    }
  }, [busyId, dismiss]);

  const value = useMemo<ToastState>(() => ({ toasts, push, dismiss, clear }), [clear, dismiss, push, toasts]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.length > 0 ? (
        <div className="toast-stack" role="region" aria-label="Avisos de alertas" aria-live="assertive">
          {toasts.map((toast) => {
            const acknowledged = acknowledgedIds.has(toast.id);
            return (
              <article key={toast.id} className={`toast toast-${toast.tone}`}>
                {toast.kicker ? <p className="toast-kicker">{toast.kicker}</p> : null}
                <h3>{toast.title}</h3>
                {toast.note ? <p className="toast-note">{toast.note}</p> : null}
                <p className="toast-body">{toast.body}</p>
                {acknowledged ? (
                  <p className="toast-note" role="status">
                    Lectura confirmada. Continúe con la atención del evento.
                  </p>
                ) : null}
                {errorById[toast.id] ? <p className="toast-error" role="alert">{errorById[toast.id]}</p> : null}
                {acknowledged && toast.followUpHref ? (
                  <div className="toast-actions">
                    <Link
                      to={toast.followUpHref}
                      className="btn toast-confirm"
                      onClick={() => dismiss(toast.id)}
                    >
                      {toast.followUpLabel ?? "Ir al evento"}
                    </Link>
                    <button
                      type="button"
                      className="btn button-quiet toast-dismiss"
                      onClick={() => dismiss(toast.id)}
                    >
                      {toast.dismissLabel ?? "Cerrar"}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn toast-confirm"
                    disabled={busyId === toast.id}
                    onClick={() => void confirm(toast)}
                  >
                    {busyId === toast.id ? "Confirmando…" : toast.confirmLabel}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast debe usarse dentro de ToastProvider.");
  return value;
}
