import type { ReactNode } from "react";
import { useId } from "react";

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
  const gradientId = useId();

  return (
    <svg className="icon brand-mark" viewBox="0 0 32 32" role="img" aria-label="Vitalsy">
      <defs>
        <linearGradient id={gradientId} x1="4" y1="2" x2="28" y2="30" gradientUnits="userSpaceOnUse">
          <stop stopColor="#14B8C6" />
          <stop offset="1" stopColor="#0E4C92" />
        </linearGradient>
      </defs>
      <path fill={`url(#${gradientId})`} d="M12 4h8v6h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-6v6H12v-6H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h6V4Z" />
      <path d="M6 16h5l2-3 2.2 6 2-3H26" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24.5" cy="7.5" r="4.2" fill="#E23B4A" />
      <path d="M24.5 5.4v2.5" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="24.5" cy="9.4" r=".7" fill="#fff" />
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

