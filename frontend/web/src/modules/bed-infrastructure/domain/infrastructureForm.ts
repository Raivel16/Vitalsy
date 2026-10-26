export type GenderPolicy = "mixed" | "male" | "female";

export const GENDER_OPTIONS: Array<{ value: GenderPolicy; label: string }> = [
  { value: "mixed", label: "Mixta" },
  { value: "male", label: "Solo hombres" },
  { value: "female", label: "Solo mujeres" },
];

export const SPECIALTY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "medicina_interna", label: "Medicina interna" },
  { value: "cirugia", label: "Cirugía" },
  { value: "cuidados_intensivos", label: "Cuidados intensivos" },
  { value: "pediatria", label: "Pediatría" },
  { value: "ginecologia_obstetricia", label: "Ginecología y obstetricia" },
  { value: "traumatologia", label: "Traumatología" },
];

export const MAX_BULK_BEDS = 200;
export const MAX_BEDS_PER_ROOM = 6;

export type WardFormValues = { code: string; name: string; specialty: string };
export type BedFormValues = { wardId: string; room: string; bedCode: string; genderPolicy: GenderPolicy; isolation: boolean };
export type BulkFormValues = {
  wardId: string;
  roomFrom: string;
  roomTo: string;
  bedsPerRoom: string;
  genderPolicy: GenderPolicy;
  isolation: boolean;
};

type Errors<T> = Partial<Record<keyof T, string>>;

/** Validación previa al envío (RF-110); el servidor repite las reglas. */
export function validateWardForm(values: WardFormValues): Errors<WardFormValues> {
  const errors: Errors<WardFormValues> = {};
  const code = values.code.trim();
  if (!code) errors.code = "El código es obligatorio.";
  else if (!/^[A-Za-z0-9-]+$/.test(code)) errors.code = "Use solo letras, números y guion.";
  if (!values.name.trim()) errors.name = "El nombre es obligatorio.";
  if (!values.specialty) errors.specialty = "Seleccione una especialidad.";
  return errors;
}

export function validateBedForm(values: BedFormValues): Errors<BedFormValues> {
  const errors: Errors<BedFormValues> = {};
  if (!values.wardId) errors.wardId = "Seleccione un pabellón.";
  if (!values.room.trim()) errors.room = "La habitación es obligatoria.";
  if (!values.bedCode.trim()) errors.bedCode = "El código de cama es obligatorio.";
  return errors;
}

function positiveInt(value: string): number | null {
  return /^\d+$/.test(value.trim()) ? Number.parseInt(value, 10) : null;
}

export function bulkBedCount(values: BulkFormValues): number {
  const from = positiveInt(values.roomFrom);
  const to = positiveInt(values.roomTo);
  const per = positiveInt(values.bedsPerRoom);
  if (from === null || to === null || per === null || to < from) return 0;
  return (to - from + 1) * per;
}

export function validateBulkForm(values: BulkFormValues): Errors<BulkFormValues> {
  const errors: Errors<BulkFormValues> = {};
  if (!values.wardId) errors.wardId = "Seleccione un pabellón.";
  const from = positiveInt(values.roomFrom);
  const to = positiveInt(values.roomTo);
  const per = positiveInt(values.bedsPerRoom);
  if (from === null) errors.roomFrom = values.roomFrom.trim() ? "Use solo números." : "Indique la habitación inicial.";
  if (to === null) errors.roomTo = values.roomTo.trim() ? "Use solo números." : "Indique la habitación final.";
  else if (from !== null && to < from) errors.roomTo = "La habitación final debe ser mayor o igual a la inicial.";
  if (per === null || per < 1 || per > MAX_BEDS_PER_ROOM) errors.bedsPerRoom = `Indique de 1 a ${MAX_BEDS_PER_ROOM} camas por habitación.`;
  if (!errors.roomTo && !errors.bedsPerRoom && bulkBedCount(values) > MAX_BULK_BEDS) {
    errors.roomTo = `El alta en lote admite hasta ${MAX_BULK_BEDS} camas por operación.`;
  }
  return errors;
}
