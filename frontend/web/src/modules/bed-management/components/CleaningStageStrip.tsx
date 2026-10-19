import { STAGES, type CleaningStatus } from "../domain/cleaningStage";

/** Tira de las 4 etapas del circuito de habilitación; cada una filtra la lista. */
export function CleaningStageStrip({
  counts,
  active,
  onSelect,
}: Readonly<{
  counts: Record<CleaningStatus, number>;
  active: CleaningStatus | "todas";
  onSelect: (next: CleaningStatus | "todas") => void;
}>) {
  return (
    <div className="stage-grid" aria-label="Etapas de habilitación">
      {STAGES.map((stage) => (
        <button
          key={stage.id}
          type="button"
          className={`stage-card stage-${stage.id}${active === stage.id ? " is-active" : ""}`}
          aria-pressed={active === stage.id}
          onClick={() => onSelect(active === stage.id ? "todas" : stage.id)}
        >
          <span>{stage.step}</span>
          <strong>{counts[stage.id]}</strong>
          <em>{stage.label}</em>
          <small>{stage.hint}</small>
        </button>
      ))}
    </div>
  );
}
