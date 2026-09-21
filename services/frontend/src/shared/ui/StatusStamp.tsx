type CoverageStampStatus = "aprobada" | "pendiente" | "rechazada";

const ICONS: Record<CoverageStampStatus, string> = {
  aprobada: "✓",
  pendiente: "!",
  rechazada: "×",
};

export function StatusStamp({
  status,
  label,
}: {
  status: CoverageStampStatus;
  label?: string;
}) {
  const text = label ?? `Cobertura ${status}`;
  return (
    <p className={`stamp stamp-${status}`} role="status" aria-label={text}>
      <span aria-hidden="true">{ICONS[status]}</span>
      {text}
    </p>
  );
}
