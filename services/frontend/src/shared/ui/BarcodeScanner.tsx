import { useEffect, useId, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Button } from "./Button";
import { Feedback } from "./Sheet";

type Props = {
  onScan: (code: string) => void;
};

const BARCODE_FORMATS = [
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
];

export function BarcodeScanner({ onScan }: Props) {
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

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 280, height: 140 } },
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
