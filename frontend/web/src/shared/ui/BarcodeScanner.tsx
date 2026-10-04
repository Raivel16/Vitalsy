import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { IconCamera } from "@tabler/icons-react";
import { Button } from "./Button";
import { Feedback } from "./Sheet";

type Props = {
  onScan: (code: string) => void;
  /** Etiqueta del botón (p. ej. brazalete o medicamento). */
  label?: string;
  variant?: "primary" | "quiet";
};

const BARCODE_FORMATS = [
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
];

export function BarcodeScanner({ onScan, label = "Escanear brazalete", variant = "quiet" }: Props) {
  const reactId = useId().replace(/:/g, "");
  const elementId = `scanner-${reactId}`;
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const onScanRef = useRef(onScan);
  const handledRef = useRef(false);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!open) return undefined;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    let active = true;
    let stopped = false;
    handledRef.current = false;
    setError("");

    const scanner = new Html5Qrcode(elementId, {
      formatsToSupport: BARCODE_FORMATS,
      verbose: false,
    });

    async function stopSafely() {
      if (stopped) return;
      stopped = true;
      try {
        if (scanner.isScanning) {
          await scanner.stop();
        }
      } catch {
        /* already stopped */
      }
      try {
        scanner.clear();
      } catch {
        /* already cleared */
      }
    }

    const narrow = window.matchMedia("(max-width: 860px)").matches;
    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: narrow ? { width: 220, height: 110 } : { width: 280, height: 140 } },
        (decoded) => {
          if (!active || handledRef.current) return;
          const code = decoded.trim();
          if (!code) return;
          handledRef.current = true;
          void stopSafely().then(() => {
            if (!active) return;
            onScanRef.current(code);
            setOpen(false);
          });
        },
        () => undefined,
      )
      .catch(() => {
        if (active) setError("No se pudo abrir la cámara. Permita el acceso o escriba el código.");
      });

    return () => {
      active = false;
      void stopSafely();
    };
  }, [elementId, open]);

  return (
    <>
      <Button variant={variant} type="button" onClick={() => setOpen(true)}>
        <IconCamera size={18} stroke={1.75} aria-hidden />
        {label}
      </Button>
      {open ? createPortal(
        <div
          className="scanner-modal"
          role="dialog"
          aria-modal="true"
          aria-label={label}
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <div className="scanner-modal-card">
            <header className="scanner-modal-head">
              <strong>{label}</strong>
              <Button variant="quiet" type="button" onClick={() => setOpen(false)}>Cerrar</Button>
            </header>
            {error ? <Feedback tone="error">{error}</Feedback> : null}
            <div id={elementId} className="scanner-view" />
            <p className="hint">Apunte la cámara al código. Si no puede leerlo, cierre y escríbalo.</p>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
