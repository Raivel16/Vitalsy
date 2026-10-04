/** Strip non-digit characters; optionally cap length. */
export function digitsOnly(value: string, maxLength?: number): string {
  const digits = value.replace(/\D+/g, "");
  return typeof maxLength === "number" ? digits.slice(0, maxLength) : digits;
}

export function requiredText(value: string, message: string): string | undefined {
  if (!value.trim()) return message;
  return undefined;
}

export function documentNumberError(value: string, label = "El documento"): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return `${label} es obligatorio.`;
  if (!/^\d+$/.test(trimmed)) return `${label} solo admite números.`;
  return undefined;
}

export function phoneNumberError(
  value: string,
  options?: { label?: string; min?: number; max?: number },
): string | undefined {
  const label = options?.label ?? "El teléfono";
  const min = options?.min ?? 7;
  const max = options?.max ?? 15;
  const trimmed = value.trim();
  if (!trimmed) return `${label} es obligatorio.`;
  if (!/^\d+$/.test(trimmed)) return `${label} solo admite números.`;
  if (trimmed.length < min || trimmed.length > max) {
    return `${label} solo admite dígitos (${min} a ${max}).`;
  }
  return undefined;
}
