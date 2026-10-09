import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "../../../shared/ui/Button";

/** Cajón lateral para registrar una solicitud sin salir de la lista de espera. */
export function BedRequestDrawer({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={panelRef} className="drawer-panel" role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}>
        <header className="drawer-head">
          <h3>{title}</h3>
          <Button type="button" variant="quiet" onClick={onClose}>Cerrar</Button>
        </header>
        <div className="drawer-body">{children}</div>
      </div>
    </div>
  );
}
