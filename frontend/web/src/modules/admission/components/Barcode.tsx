import { useLayoutEffect, useState } from "react";
import JsBarcode from "jsbarcode";

const SVG_NS = "http://www.w3.org/2000/svg";

function escapeXml(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function toDataUri(markup: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
}

/** Barras deterministas para entornos sin canvas (pruebas) o si JsBarcode falla. */
function fallbackMarkup(value: string): string {
  const widths = value.split("").map((char) => ((char.codePointAt(0) ?? 0) % 3) + 1);
  const starts = widths.reduce<number[]>((acc, _width, i) => [...acc, i === 0 ? 4 : acc[i - 1] + widths[i - 1] + 1], []);
  const x = widths.length === 0 ? 4 : (starts.at(-1) ?? 0) + (widths.at(-1) ?? 0) + 1;
  const bars = widths.map((width, i) => `<rect x="${starts[i]}" y="4" width="${width}" height="40" fill="#0E4C92"/>`).join("");
  return (
    `<svg xmlns="${SVG_NS}" width="${x + 8}" height="56" viewBox="0 0 ${x + 8} 56">` +
    `<rect x="0" y="0" width="${x + 8}" height="56" fill="#ffffff"/>${bars}` +
    `<text x="8" y="54" font-size="10" fill="#0E4C92">${escapeXml(value)}</text></svg>`
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

function jsBarcodeMarkup(value: string): string | null {
  try {
    const node = document.createElementNS(SVG_NS, "svg");
    JsBarcode(node, value, {
      format: "CODE128",
      displayValue: true,
      fontSize: 14,
      height: 40,
      margin: 6,
      background: "#ffffff",
      lineColor: "#1E6B7B",
    });
    node.setAttribute("xmlns", SVG_NS);
    return new XMLSerializer().serializeToString(node);
  } catch {
    return null;
  }
}

export function Barcode({ value, id = "wristband-barcode" }: Readonly<{ value: string; id?: string }>) {
  const [jsSource, setJsSource] = useState<string | null>(null);

  useLayoutEffect(() => {
    const markup = value && canUseJsBarcode() ? jsBarcodeMarkup(value) : null;
    setJsSource(markup ? toDataUri(markup) : null);
  }, [value]);

  return (
    <div id={id} className="barcode-wrap">
      <img className="barcode" src={jsSource ?? toDataUri(fallbackMarkup(value))} alt={`Código de barras ${value}`} />
    </div>
  );
}

// Utilidad de impresión junto al componente que imprime; no afecta al refresco rápido.
// eslint-disable-next-line react-refresh/only-export-components
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
  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 500);
  };
  frame.srcdoc = `<!doctype html><html><head><title>Brazalete</title>
    <style>body{margin:0;display:grid;place-items:center;min-height:100vh}svg{width:90mm;height:auto}</style>
    </head><body>${markup}</body></html>`;
  document.body.appendChild(frame);
}
