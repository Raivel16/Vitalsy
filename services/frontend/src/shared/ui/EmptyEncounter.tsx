import { Feedback } from "./Sheet";
import { ButtonLink } from "./Button";

export function EmptyEncounter({
  message,
  to = "/pacientes",
  ctaLabel = "Ir a pacientes",
}: {
  message: string;
  to?: string;
  ctaLabel?: string;
}) {
  return (
    <>
      <Feedback tone="info">{message}</Feedback>
      <p>
        <ButtonLink to={to}>{ctaLabel}</ButtonLink>
      </p>
    </>
  );
}
