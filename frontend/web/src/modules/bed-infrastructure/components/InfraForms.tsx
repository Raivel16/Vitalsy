import { useState, type SubmitEvent } from "react";
import { Button } from "../../../shared/ui/Button";
import { CheckField, SelectField, TextField } from "../../../shared/ui/Field";
import { Panel } from "../../../shared/ui/clinical";
import {
  GENDER_OPTIONS,
  SPECIALTY_OPTIONS,
  validateBedForm,
  validateBulkForm,
  validateWardForm,
  type BedFormValues,
  type BulkFormValues,
  type GenderPolicy,
  type WardFormValues,
} from "../domain/infrastructureForm";
import type { InfraWard } from "../types";

const EMPTY_WARD: WardFormValues = { code: "", name: "", specialty: "" };
const EMPTY_BED: BedFormValues = { wardId: "", room: "", bedCode: "", genderPolicy: "mixed", isolation: false };
const EMPTY_BULK: BulkFormValues = { wardId: "", roomFrom: "", roomTo: "", bedsPerRoom: "", genderPolicy: "mixed", isolation: false };

type Errors<T> = Partial<Record<keyof T, string>>;

function GenderSelect({ id, label, value, onChange }: Readonly<{ id: string; label: string; value: GenderPolicy; onChange: (value: GenderPolicy) => void }>) {
  return (
    <SelectField id={id} label={label} value={value} onChange={(e) => onChange(e.target.value as GenderPolicy)}>
      {GENDER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </SelectField>
  );
}

function WardSelect({ id, label, wards, value, error, onChange }: Readonly<{ id: string; label: string; wards: InfraWard[]; value: string; error?: string; onChange: (value: string) => void }>) {
  return (
    <SelectField id={id} label={label} value={value} error={error} onChange={(e) => onChange(e.target.value)}>
      <option value="">Seleccione…</option>
      {wards.map((ward) => <option key={ward.id} value={ward.id}>{ward.code} · {ward.name}</option>)}
    </SelectField>
  );
}

export function WardForm({ onSubmit }: Readonly<{ onSubmit: (values: WardFormValues) => Promise<boolean> }>) {
  const [values, setValues] = useState(EMPTY_WARD);
  const [errors, setErrors] = useState<Errors<WardFormValues>>({});
  const [pending, setPending] = useState(false);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    const found = validateWardForm(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setPending(true);
    if (await onSubmit(values)) setValues(EMPTY_WARD);
    setPending(false);
  }

  return (
    <Panel title="Nuevo pabellón">
      <form className="form-grid" onSubmit={submit} noValidate>
        <TextField id="ward-code" label="Código del pabellón" value={values.code} error={errors.code} maxLength={20} onChange={(e) => setValues({ ...values, code: e.target.value })} />
        <TextField id="ward-name" label="Nombre del pabellón" value={values.name} error={errors.name} maxLength={120} onChange={(e) => setValues({ ...values, name: e.target.value })} />
        <SelectField id="ward-specialty" label="Especialidad" value={values.specialty} error={errors.specialty} onChange={(e) => setValues({ ...values, specialty: e.target.value })}>
          <option value="">Seleccione…</option>
          {SPECIALTY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </SelectField>
        <Button type="submit" pending={pending}>Crear pabellón</Button>
      </form>
    </Panel>
  );
}

export function BedForm({ wards, onSubmit }: Readonly<{ wards: InfraWard[]; onSubmit: (values: BedFormValues) => Promise<boolean> }>) {
  const [values, setValues] = useState(EMPTY_BED);
  const [errors, setErrors] = useState<Errors<BedFormValues>>({});
  const [pending, setPending] = useState(false);

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    const found = validateBedForm(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setPending(true);
    if (await onSubmit(values)) setValues({ ...EMPTY_BED, wardId: values.wardId });
    setPending(false);
  }

  return (
    <Panel title="Nueva cama">
      <form className="form-grid" onSubmit={submit} noValidate>
        <WardSelect id="bed-ward" label="Pabellón de la cama" wards={wards} value={values.wardId} error={errors.wardId} onChange={(wardId) => setValues({ ...values, wardId })} />
        <TextField id="bed-room" label="Habitación" value={values.room} error={errors.room} maxLength={20} onChange={(e) => setValues({ ...values, room: e.target.value })} />
        <TextField id="bed-code" label="Código de cama" value={values.bedCode} error={errors.bedCode} maxLength={10} onChange={(e) => setValues({ ...values, bedCode: e.target.value })} />
        <GenderSelect id="bed-gender" label="Política de género" value={values.genderPolicy} onChange={(genderPolicy) => setValues({ ...values, genderPolicy })} />
        <CheckField id="bed-isolation" label="Cama de aislamiento" checked={values.isolation} onChange={(e) => setValues({ ...values, isolation: e.target.checked })} />
        <Button type="submit" pending={pending}>Crear cama</Button>
      </form>
    </Panel>
  );
}

export function BulkForm({
  wards,
  onPreview,
  onChange,
}: Readonly<{
  wards: InfraWard[];
  onPreview: (values: BulkFormValues) => Promise<void>;
  onChange: (values: BulkFormValues) => void;
}>) {
  const [values, setValues] = useState(EMPTY_BULK);
  const [errors, setErrors] = useState<Errors<BulkFormValues>>({});
  const [pending, setPending] = useState(false);

  function update(next: BulkFormValues) {
    setValues(next);
    onChange(next);
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    const found = validateBulkForm(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setPending(true);
    await onPreview(values);
    setPending(false);
  }

  return (
    <Panel title="Alta en lote">
      <p className="hint">Genere varias habitaciones con sus camas de una vez (A, B, C…). Las camas que ya existen se omiten.</p>
      <form className="form-grid" onSubmit={submit} noValidate>
        <WardSelect id="bulk-ward" label="Pabellón del lote" wards={wards} value={values.wardId} error={errors.wardId} onChange={(wardId) => update({ ...values, wardId })} />
        <TextField id="bulk-from" label="Habitación inicial" inputMode="numeric" value={values.roomFrom} error={errors.roomFrom} onChange={(e) => update({ ...values, roomFrom: e.target.value })} />
        <TextField id="bulk-to" label="Habitación final" inputMode="numeric" value={values.roomTo} error={errors.roomTo} onChange={(e) => update({ ...values, roomTo: e.target.value })} />
        <TextField id="bulk-per" label="Camas por habitación" inputMode="numeric" value={values.bedsPerRoom} error={errors.bedsPerRoom} onChange={(e) => update({ ...values, bedsPerRoom: e.target.value })} />
        <GenderSelect id="bulk-gender" label="Política de género del lote" value={values.genderPolicy} onChange={(genderPolicy) => update({ ...values, genderPolicy })} />
        <CheckField id="bulk-isolation" label="Aislamiento en todas las camas del lote" checked={values.isolation} onChange={(e) => update({ ...values, isolation: e.target.checked })} />
        <Button type="submit" variant="quiet" pending={pending}>Vista previa del lote</Button>
      </form>
    </Panel>
  );
}
