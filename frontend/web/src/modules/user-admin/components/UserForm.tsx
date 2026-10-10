import { type FormEvent, useState } from "react";
import { ROLES, ROLE_LABEL } from "../../../app/roles";
import { Button } from "../../../shared/ui/Button";
import { SelectField, TextField } from "../../../shared/ui/Field";
import { FormActions } from "../../../shared/ui/FormActions";
import { type UserFormErrors, type UserFormValues, validateUserForm } from "../domain/userForm";

export function UserForm({
  initial,
  submitLabel,
  pending,
  onSubmit,
}: {
  initial: UserFormValues;
  submitLabel: string;
  pending: boolean;
  onSubmit: (values: UserFormValues) => void;
}) {
  const [values, setValues] = useState<UserFormValues>(initial);
  const [errors, setErrors] = useState<UserFormErrors>({});

  function submit(event: FormEvent) {
    event.preventDefault();
    const found = validateUserForm(values);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    onSubmit({ ...values, name: values.name.trim(), email: values.email.trim() });
  }

  return (
    <form className="form-grid" onSubmit={submit} noValidate>
      <TextField
        id="user-name"
        label="Nombre completo"
        value={values.name}
        error={errors.name}
        onChange={(e) => setValues({ ...values, name: e.target.value })}
      />
      <TextField
        id="user-email"
        label="Correo institucional"
        type="email"
        value={values.email}
        error={errors.email}
        onChange={(e) => setValues({ ...values, email: e.target.value })}
      />
      <SelectField
        id="user-role"
        label="Rol"
        value={values.role}
        error={errors.role}
        onChange={(e) => setValues({ ...values, role: e.target.value })}
      >
        <option value="">Seleccione un rol</option>
        {ROLES.map((role) => (
          <option key={role} value={role}>{ROLE_LABEL[role]}</option>
        ))}
      </SelectField>
      <FormActions>
        <Button type="submit" pending={pending}>{submitLabel}</Button>
      </FormActions>
    </form>
  );
}
