import type { ReactNode } from "react";

type IconProps = { title?: string };

function Svg({ children, title }: IconProps & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden={title ? undefined : true} role={title ? "img" : undefined} className="icon">
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}

export function SealIcon() {
  return (
    <Svg title="Sello de Vitalsy">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M4 13.5c2.2-1.2 3.4-3.4 4.2-5.2.6 2.4 2 4.2 4 5.4 1.8-1.6 2.8-3.6 3.4-5.6.8 2.2 2.2 4.2 4.4 5.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 4.5v3.2M12 16.2V19.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </Svg>
  );
}

export function PulseIcon() {
  return (
    <Svg>
      <path d="M3 12h4l2-5 3 10 2-5h7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

