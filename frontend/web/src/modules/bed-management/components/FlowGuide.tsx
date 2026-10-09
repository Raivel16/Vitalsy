import { PROCESS_STEPS, guideFor, type GuideCounts } from "../domain/flowGuide";

/** Circuito del proceso + «tu siguiente paso» según el rol y su cola real. */
export function FlowGuide({ role, counts }: { role: string; counts: GuideCounts }) {
  const next = guideFor(role, counts);

  return (
    <section className="flow-guide" aria-label="Guía del proceso">
      <ol className="flow-steps">
        {PROCESS_STEPS.map((step, index) => (
          <li
            key={step.id}
            className={step.id === next.step ? "flow-step is-current" : "flow-step"}
            aria-current={step.id === next.step ? "step" : undefined}
          >
            <span className="flow-step-index" aria-hidden>{index + 1}</span>
            <span className="flow-step-copy">
              <span className="flow-step-label">{step.label}</span>
              <span className="flow-step-owner">{step.owner}</span>
            </span>
          </li>
        ))}
      </ol>
      <div className="flow-next">
        <span className="flow-next-kicker">Tu siguiente paso</span>
        <strong>{next.headline}</strong>
        <span>{next.detail}</span>
      </div>
    </section>
  );
}
