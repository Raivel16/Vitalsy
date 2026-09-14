import type { ReactNode } from "react";

export function Sheet({ kicker, title, children }: { kicker: string; title: string; children: ReactNode }) {
  return (
    <article className="sheet">
      <p className="kicker">{kicker}</p>
      <h2>{title}</h2>
      {children}
    </article>
  );
}

export function Feedback({ tone, children }: { tone: "error" | "success" | "info"; children: ReactNode }) {
  if (tone === "error") {
    return (
      <p className="banner banner-error" role="alert">
        {children}
      </p>
    );
  }
  return <p className={`banner banner-${tone}`} role="status">{children}</p>;
}
