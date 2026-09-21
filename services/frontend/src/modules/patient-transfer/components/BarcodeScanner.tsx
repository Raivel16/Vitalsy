import { useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "../../../shared/ui/Button";
import { Feedback } from "../../../shared/ui/Sheet";

type Props = {
  onScan: (code: string) => void;
};

export function BarcodeScanner({ onScan }: Props) {
  const reactId = useId().replace(/:/g, "");
  const elementId = `scanner-${reactId}`;
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    const scanner = new Html5Qrcode(elementId);
    scannerRef.current = scanner;
    setError("");
    scanner
      .start(
        { facingMode: "environment" },
        { fps: 8, qrbox: { width: 260, height: 120 } },
        (decoded) => {
          if (!active) return;
          onScan(decoded.trim());
          setOpen(false);
        },
        () => undefined,
      )
      .catch(() => {
        if (active) setError("No se pudo abrir la cámara. Permita el acceso o escriba el código.");
      });

    return () => {
      active = false;
      scanner
        .stop()
        .catch(() => undefined)
        .finally(() => {
          scanner.clear();
          scannerRef.current = null;
        });
    };
  }, [elementId, onScan, open]);

  return (
    <div className="scanner-box">
      {!open ? (
        <Button variant="quiet" type="button" onClick={() => setOpen(true)}>
          Escanear brazalete
        </Button>
      ) : (
        <Button variant="quiet" type="button" onClick={() => setOpen(false)}>
          Cerrar escáner
        </Button>
      )}
      {open ? <div id={elementId} className="scanner-view" /> : null}
      {error ? <Feedback tone="error">{error}</Feedback> : null}
    </div>
  );
}
