import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type Shared = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  wide?: boolean;
  compact?: boolean;
  hideLabel?: boolean;
  labelAside?: ReactNode;
  icon?: ReactNode;
};

function describedBy(id: string, error?: string, hint?: string) {
  return [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
}

function FieldMeta({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  return (
    <div className="field-meta">
      {hint ? <p id={`${id}-hint`} className="hint">{hint}</p> : null}
      {error ? <p id={`${id}-error`} className="field-error">{error}</p> : null}
    </div>
  );
}

function FieldLabel({ id, label, labelAside, hideLabel }: { id: string; label: string; labelAside?: ReactNode; hideLabel?: boolean }) {
  return (
    <label htmlFor={id} className={hideLabel ? "sr-only" : undefined}>
      <span>{label}</span>
      {labelAside ? <span className="field-aside">{labelAside}</span> : null}
    </label>
  );
}

function fieldClass(wide?: boolean, compact?: boolean) {
  return [wide ? "field form-span-2" : "field", compact ? "field-compact" : ""].filter(Boolean).join(" ");
}

export function UnitField({
  id,
  label,
  unit,
  abbr,
  error,
  compact = true,
  ...props
}: Shared & InputHTMLAttributes<HTMLInputElement> & { unit: string; abbr?: string }) {
  return (
    <div className={fieldClass(false, compact)}>
      <span className="bp-label">
        <FieldLabel id={id} label={label} />
        {abbr ? <span className="field-aside" aria-hidden>{abbr}</span> : null}
      </span>
      <div className="unit-control">
        <input id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy(id, error)} {...props} />
        <span className="unit-chip">{unit}</span>
      </div>
      {error ? <p id={`${id}-error`} className="field-error">{error}</p> : null}
    </div>
  );
}

export function TextField({ id, label, error, hint, wide, compact, hideLabel, labelAside, icon, ...props }: Shared & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={[fieldClass(wide, compact), error ? "has-error" : ""].filter(Boolean).join(" ")}>
      <FieldLabel id={id} label={label} labelAside={labelAside} hideLabel={hideLabel} />
      <div className={icon ? "field-control" : undefined}>
        <input id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy(id, error, hint)} {...props} />
        {icon ? <span className="field-icon" aria-hidden>{icon}</span> : null}
      </div>
      <FieldMeta id={id} error={error} hint={hint} />
    </div>
  );
}

export function TextAreaField({ id, label, error, hint, wide, compact, hideLabel, labelAside, ...props }: Shared & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className={fieldClass(wide, compact)}>
      <FieldLabel id={id} label={label} labelAside={labelAside} hideLabel={hideLabel} />
      <textarea id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy(id, error, hint)} {...props} />
      <FieldMeta id={id} error={error} hint={hint} />
    </div>
  );
}

export function SelectField({ id, label, error, hint, wide, compact, hideLabel, labelAside, icon, children, ...props }: Shared & SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <div className={[fieldClass(wide, compact), error ? "has-error" : ""].filter(Boolean).join(" ")}>
      <FieldLabel id={id} label={label} labelAside={labelAside} hideLabel={hideLabel} />
      <div className={icon ? "field-control" : undefined}>
        <select id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy(id, error, hint)} {...props}>
          {children}
        </select>
        {icon ? <span className="field-icon" aria-hidden>{icon}</span> : null}
      </div>
      <FieldMeta id={id} error={error} hint={hint} />
    </div>
  );
}

export function CheckField({
  id,
  label,
  error,
  description,
  className,
  wide: _wide,
  labelAside: _labelAside,
  hint: _hint,
  ...props
}: Shared & InputHTMLAttributes<HTMLInputElement> & { description?: string }) {
  return (
    <div className={["check", className].filter(Boolean).join(" ")}>
      <input id={id} type="checkbox" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} {...props} />
      <div className="check-copy">
        <label htmlFor={id}>{label}</label>
        {description ? <p className="hint">{description}</p> : null}
      </div>
      {error ? <p id={`${id}-error`} className="field-error">{error}</p> : null}
    </div>
  );
}
