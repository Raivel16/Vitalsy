import type { ReactNode } from "react";

export function Sheet({
  kicker,
  title,
  children,
  wide = false,
  framed = false,
  aside,
  clinic,
}: {
  kicker: string;
  title: string;
  children: ReactNode;
  wide?: boolean;
  framed?: boolean;
  aside?: ReactNode;
  clinic?: "form" | "board" | "file";
}) {
  const head = (
    <header className="page-head">
      <div>
        {kicker ? <p className="kicker">{kicker}</p> : null}
        {title ? <h2>{title}</h2> : null}
      </div>
      {aside}
    </header>
  );

  const clinicClass = clinic === "board"
    ? "clinic-sheet clinic-board"
    : clinic === "file"
      ? "clinic-sheet clinic-file"
      : clinic === "form"
        ? "clinic-sheet clinic-form"
        : "";

  if (clinic === "file") {
    return (
      <article className={["sheet", "sheet-wide", clinicClass].filter(Boolean).join(" ")}>
        <div className="sheet-surface">
          {head}
          {children}
        </div>
      </article>
    );
  }

  if (clinic === "board") {
    return (
      <article className={["sheet", "sheet-wide", clinicClass].filter(Boolean).join(" ")}>
        {head}
        {children}
      </article>
    );
  }

  if (wide && framed) {
    return (
      <article className={["sheet", "sheet-wide", clinicClass].filter(Boolean).join(" ")}>
        <div className="sheet-surface">
          {head}
          {children}
        </div>
      </article>
    );
  }

  if (wide) {
    return (
      <article className={["sheet", "sheet-wide", clinicClass].filter(Boolean).join(" ")}>
        {head}
        {children}
      </article>
    );
  }

  return (
    <article className={["sheet", clinicClass].filter(Boolean).join(" ")}>
      <div className="sheet-surface">
        {head}
        {children}
      </div>
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
