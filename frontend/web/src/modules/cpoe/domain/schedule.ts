/** Lista de `backend/api/app/Support/MedicationFrequency.php` (RF-25). */
export const MEDICATION_FREQUENCIES = [
  "cada 4 horas",
  "cada 6 horas",
  "cada 8 horas",
  "cada 12 horas",
  "cada 24 horas",
  "dosis única",
] as const;

/** Mismo margen que el backend: permite indicar la primera dosis en el minuto en curso. */
const PAST_TOLERANCE_MS = 5 * 60_000;

export function isListedFrequency(frequency: string): boolean {
  return (MEDICATION_FREQUENCIES as readonly string[]).includes(frequency);
}

/** Valor para `<input type="datetime-local">`, en la hora local del navegador. */
export function toDateTimeInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function isPastFirstDose(value: string): boolean {
  return new Date(value).getTime() < Date.now() - PAST_TOLERANCE_MS;
}
