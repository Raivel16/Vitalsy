import { useLayoutEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";

function FallbackBars({ value }: { value: string }) {
  const widths = value.split("").map((char) => ((char.codePointAt(0) ?? 0) % 3) + 1);
  let x = 4;
  const bars = widths.map((width, index) => {
    const rect = <rect key={index} x={x} y="4" width={width} height="40" fill="#0E4C92" />;
    x += width + 1;
    return rect;
  });
  return (
    <svg className="barcode" viewBox={`0 0 ${x + 8} 56`} role="img" aria-label={`Código de barras ${value}`}>
      <rect x="0" y="0" width={x + 8} height="56" fill="#ffffff" />
      {bars}
      <text x={8} y="54" fontSize="10" fill="#0E4C92">
        {value}
      </text>
    </svg>
  );
}

function canUseJsBarcode() {
  if (import.meta.env.MODE === "test") return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext?.("2d"));
  } catch {
    return false;
  }
}

export function Barcode({ value, id = "wristband-barcode" }: { value: string; id?: string }) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [mode, setMode] = useState<"js" | "fallback">(() => (canUseJsBarcode() ? "js" : "fallback"));

  useLayoutEffect(() => {
    if (!value || mode === "fallback") return;
    const node = svgRef.current;
    if (!node || !canUseJsBarcode()) {
      setMode("fallback");
      return;
    }
    try {
      JsBarcode(node, value, {
        format: "CODE128",
        displayValue: true,
        fontSize: 14,
        height: 40,
        margin: 6,
        background: "#ffffff",
        lineColor: "#1E6B7B",
      });
    } catch {
      setMode("fallback");
    }
  }, [mode, value]);

  return (
    <div id={id} className="barcode-wrap">
      {mode === "fallback" ? (
        <FallbackBars value={value} />
      ) : (
        <svg
          ref={svgRef}
          className="barcode"
          width={240}
          height={80}
          role="img"
          aria-label={`Código de barras ${value}`}
        />
      )}
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
