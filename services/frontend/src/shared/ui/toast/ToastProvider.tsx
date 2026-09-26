import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type Toast = {
  id: string;
  /** `critical` exige confirmación explícita; no se cierra por tiempo. */
  tone: "critical" | "info";
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  note?: string;
};

type ToastState = {
  toasts: Toast[];
  push: (toast: Toast) => void;
  dismiss: (id: string) => void;
  clear: () => void;
};

const ToastContext = createContext<ToastState | null>(null);

/**
 * Avisos emergentes propios. No hay cierre automático: los avisos clínicos se
 * retiran solo cuando el usuario confirma su lectura (RF-94, RNF-07).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((toast: Toast) => {
    setToasts((current) => (current.some((item) => item.id === toast.id) ? current : [...current, toast]));
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const clear = useCallback(() => setToasts([]), []);

  const value = useMemo<ToastState>(() => ({ toasts, push, dismiss, clear }), [clear, dismiss, push, toasts]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.length > 0 ? (
        <div className="toast-stack" role="region" aria-label="Avisos de alertas" aria-live="assertive">
          {toasts.map((toast) => (
            <article key={toast.id} className={`toast toast-${toast.tone}`}>
              <h3>{toast.title}</h3>
              <p>{toast.body}</p>
              {toast.note ? <p className="hint">{toast.note}</p> : null}
              <button
                type="button"
                className="btn"
                onClick={() => {
                  const confirm = toast.onConfirm();
                  dismiss(toast.id);
                  void confirm;
                }}
              >
                {toast.confirmLabel}
              </button>
            </article>
          ))}
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
