import type { ReactNode } from "react";

export function Sheet({
  kicker,
  title,
  children,
  wide = false,
}: {
  kicker: string;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <article className={wide ? "sheet sheet-wide" : "sheet"}>
      <header className="page-head">
        <div>
          <p className="kicker">{kicker}</p>
          <h2>{title}</h2>
        </div>
      </header>
      {children}
    </article>
  );
}

export function Feedback({
  tone,
  children,
  label,
}: {
  tone: "error" | "success" | "info";
  children: ReactNode;
  label?: string;
}) {
  if (tone === "error") {
    return (
      <p className="banner banner-error" role="alert" aria-label={label}>
        {children}
      </p>
    );
  }
  return (
    <p className={`banner banner-${tone}`} role="status" aria-label={label}>
      {children}
    </p>
  );
}
