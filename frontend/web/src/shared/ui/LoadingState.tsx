export function LoadingState({ label = "Cargando…" }: Readonly<{ label?: string }>) {
  return (
    <div className="loading-state" role="status" aria-live="polite" aria-busy="true">
      <div className="loading-track" aria-hidden>
        <div className="loading-bar" />
      </div>
      <p>{label}</p>
    </div>
  );
}
