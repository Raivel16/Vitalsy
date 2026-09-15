import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";

function FallbackBars({ value }: { value: string }) {
  const widths = value.split("").map((char) => (char.charCodeAt(0) % 3) + 1);
  let x = 4;
  const bars = widths.map((width, index) => {
    const rect = <rect key={index} x={x} y="4" width={width} height="40" />;
    x += width + 1;
    return rect;
  });
  return (
    <svg className="barcode" viewBox={`0 0 ${x + 8} 56`} role="img" aria-label={`Código de barras ${value}`}>
      {bars}
      <text x={8} y="54" fontSize="10">{value}</text>
    </svg>
  );
}

export function Barcode({ value, id = "wristband-barcode" }: { value: string; id?: string }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [mode, setMode] = useState<"pending" | "js" | "fallback">("pending");

  useEffect(() => {
    if (!value) return;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext?.("2d");
    if (!ctx) {
      setMode("fallback");
      return;
    }
    setMode("pending");
    const timer = window.setTimeout(() => {
      if (!svgRef.current) {
        setMode("fallback");
        return;
      }
      try {
        JsBarcode(svgRef.current, value, {
          format: "CODE128",
          displayValue: true,
          fontSize: 14,
          height: 64,
          margin: 8,
          background: "#ffffff",
          lineColor: "#0E4C92",
        });
        setMode("js");
      } catch {
        setMode("fallback");
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [value]);

  if (mode === "fallback") {
    return (
      <div id={id} className="barcode-wrap">
        <FallbackBars value={value} />
      </div>
    );
  }

  return (
    <div id={id} className="barcode-wrap">
      <svg
        ref={svgRef}
        className="barcode"
        role="img"
        aria-label={`Código de barras ${value}`}
      />
    </div>
  );
}

export function printBarcodeOnly(elementId = "wristband-barcode") {
  const node = document.getElementById(elementId);
  if (!node) return;
  const markup = node.innerHTML;
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) {
    frame.remove();
    return;
  }
  doc.open();
  doc.write(`<!doctype html><html><head><title>Brazalete</title>
    <style>body{margin:0;display:grid;place-items:center;min-height:100vh}svg{width:90mm;height:auto}</style>
    </head><body>${markup}</body></html>`);
  doc.close();
  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 500);
  };
}
