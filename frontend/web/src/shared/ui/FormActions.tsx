import type { ReactNode } from "react";

export function FormActions({
  children,
  align = "start",
}: {
  children: ReactNode;
  /** `center` alinea CTAs principales (p. ej. ficha / evolución). */
  align?: "start" | "center";
}) {
  return <div className={align === "center" ? "actions actions-center" : "actions"}>{children}</div>;
}
