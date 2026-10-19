type CoverageStampStatus = "aprobada" | "pendiente" | "rechazada";

const ICONS: Record<CoverageStampStatus, string> = {
  aprobada: "✓",
  pendiente: "!",
  rechazada: "×",
};

export function StatusStamp({
  status,
  label,
}: Readonly<{
  status: CoverageStampStatus;
  label?: string;
}>) {
  const text = label ?? `Cobertura ${status}`;
  return (
    <output className={`stamp stamp-${status}`} aria-label={text}>
      <span aria-hidden="true">{ICONS[status]}</span>
      {text}
    </output>
  );
}
