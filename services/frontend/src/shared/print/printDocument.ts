export function printClinicalDocument(title: string, bodyHtml: string) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.setAttribute("data-print-document", title);
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
  doc.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"/><title>${title}</title>
    <style>
      body { margin: 24px; font: 14px/1.45 "Source Sans 3", "Segoe UI", sans-serif; color: #1b2228; }
      h1 { font-size: 22px; margin: 0 0 4px; }
      .kicker { color: #1e6b7b; font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
      dl { display: grid; gap: 8px; margin: 20px 0; }
      dt { color: #4e5c68; font-size: 12px; font-weight: 700; }
      dd { margin: 0 0 8px; font-weight: 650; }
      footer { margin-top: 28px; color: #4e5c68; font-size: 12px; }
    </style>
  </head><body>
    <p class="kicker">Vitalsy Clinical</p>
    <h1>${title}</h1>
    ${bodyHtml}
    <footer>Documento generado para impresión institucional.</footer>
  </body></html>`);
  doc.close();
  frame.onload = () => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 500);
  };
}
