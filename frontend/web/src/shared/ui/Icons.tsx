import type { ReactNode } from "react";

type IconProps = { title?: string };

function Svg({ children, title }: IconProps & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden={title ? undefined : true} className="icon">
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

/** Wordmark clínico: línea vital bajo la palabra Vitalsy. */
export function SealIcon() {
  return (
    <svg className="brand-pulse" viewBox="0 0 128 18" aria-hidden="true">
      <path
        d="M1 9h36l7-7 10 14 7-7h66"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PulseIcon() {
  return (
    <Svg>
      <path d="M3 12h4l2-5 3 10 2-5h7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

