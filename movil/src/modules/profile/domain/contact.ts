export type EmergencyContact = {
  name: string;
  phone: string;
  enabled: boolean;
};

export function validateContact(input: EmergencyContact): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!input.name.trim()) {
    errors.name = 'Escribe el nombre del contacto.';
  }
  const digits = input.phone.replace(/\D/g, '');
  if (digits.length < 7) {
    errors.phone = 'El teléfono debe tener al menos 7 dígitos.';
  }
  return errors;
}

export function normalizeContact(input: EmergencyContact): EmergencyContact {
  return {
    name: input.name.trim(),
    phone: input.phone.replace(/\D/g, ''),
    enabled: input.enabled,
  };
}
