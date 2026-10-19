import { useLocation } from "react-router";
import { Feedback } from "./Sheet";
import { ButtonLink } from "./Button";
import { withNextParam } from "../navigation/returnTo";

export function EmptyEncounter({
  message,
  to = "/pacientes",
  ctaLabel = "Ir a pacientes",
  returnTo,
}: Readonly<{
  message: string;
  to?: string;
  ctaLabel?: string;
  /** Ruta a la que volver tras elegir paciente. Por defecto, la pantalla actual. */
  returnTo?: string;
}>) {
  const location = useLocation();
  const intended = returnTo ?? location.pathname;
  const href = withNextParam(to, intended);

  return (
    <>
      <Feedback tone="info">{message}</Feedback>
      <p>
        <ButtonLink to={href}>{ctaLabel}</ButtonLink>
      </p>
    </>
  );
}
