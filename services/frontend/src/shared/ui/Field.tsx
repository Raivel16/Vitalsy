import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

type Shared = {
  id: string;
  label: string;
  error?: string;
  hint?: string;
};

function describedBy(id: string, error?: string, hint?: string) {
  return [hint ? `${id}-hint` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined;
}

export function TextField({ id, label, error, hint, ...props }: Shared & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy(id, error, hint)} {...props} />
      {hint ? <p id={`${id}-hint`} className="hint">{hint}</p> : null}
      {error ? <p id={`${id}-error`} className="field-error">{error}</p> : null}
    </div>
  );
}

export function TextAreaField({ id, label, error, hint, ...props }: Shared & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <textarea id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy(id, error, hint)} {...props} />
      {hint ? <p id={`${id}-hint`} className="hint">{hint}</p> : null}
      {error ? <p id={`${id}-error`} className="field-error">{error}</p> : null}
    </div>
  );
}

export function SelectField({ id, label, error, hint, children, ...props }: Shared & SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <select id={id} aria-invalid={Boolean(error)} aria-describedby={describedBy(id, error, hint)} {...props}>
        {children}
      </select>
      {hint ? <p id={`${id}-hint`} className="hint">{hint}</p> : null}
      {error ? <p id={`${id}-error`} className="field-error">{error}</p> : null}
    </div>
  );
}

export function CheckField({ id, label, error, ...props }: Shared & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="check">
      <input id={id} type="checkbox" aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} {...props} />
      <label htmlFor={id}>{label}</label>
      {error ? <p id={`${id}-error`} className="field-error">{error}</p> : null}
    </div>
  );
}
