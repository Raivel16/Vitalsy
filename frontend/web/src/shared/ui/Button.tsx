import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router";

type Variant = "primary" | "quiet";

function buttonClass(variant: Variant, className?: string) {
  return ["button", variant === "quiet" ? "button-quiet" : "", className].filter(Boolean).join(" ");
}

export function Button({
  variant = "primary",
  pending = false,
  className,
  disabled,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  pending?: boolean;
}) {
  return (
    <button className={buttonClass(variant, className)} disabled={disabled || pending} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  to,
  variant = "primary",
  className,
  children,
}: {
  to: string;
  variant?: Variant;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link to={to} className={buttonClass(variant, className)}>
      {children}
    </Link>
  );
}
