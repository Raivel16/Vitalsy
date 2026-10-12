const BY_CODE: Record<string, string> = {
  batch_too_large: 'El lote de datos es demasiado grande; se reintentará en partes más pequeñas.',
  sharing_closed: 'Tu consentimiento para compartir está desactivado. Actívalo para generar un código.',
  plan_not_found: 'No encontramos un plan de alta con ese código.',
  plan_claimed: 'Este plan de alta ya fue reclamado por otra cuenta.',
  no_session: 'Inicia sesión para sincronizar con Vitalsy.',
};

export function lifeErrorMessage(status: number, code?: string, serverMessage?: string): string {
  if (code && BY_CODE[code]) {
    return BY_CODE[code];
  }
  if (status === 0) {
    return 'Sin conexión';
  }
  if (status === 401) {
    return 'Tu sesión expiró. Inicia sesión de nuevo.';
  }
  if (status === 422) {
    return serverMessage?.trim() || 'Revisa los datos ingresados.';
  }
  if (status === 429) {
    return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.';
  }
  if (status >= 500) {
    return 'El servidor no está disponible en este momento. Inténtalo más tarde.';
  }
  return serverMessage?.trim() || 'No pudimos completar la solicitud.';
}
