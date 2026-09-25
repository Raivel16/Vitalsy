export function LoadingState({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="loading-state" role="status" aria-live="polite" aria-busy="true">
      <div className="loading-track" aria-hidden>
        <div className="loading-bar" />
      </div>
      <div className="loading-spinner" aria-hidden />
      <p>{label}</p>
    </div>
  );
}
