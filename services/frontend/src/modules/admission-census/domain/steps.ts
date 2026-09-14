export const STEP_PATH: Record<string, string> = {
  orden: "/admision/orden",
  filiacion: "/admision/filiacion",
  cobertura: "/admision/cobertura",
  derivacion: "/admision/cobertura",
  brazalete: "/admision/brazalete",
  expediente: "/admision/expediente",
  consentimiento: "/admision/consentimiento",
  traslado: "/traslado/orden",
  identidad: "/traslado/identidad",
  recepcion: "/piso/recepcion",
  valoracion: "/enfermeria/valoracion",
  constantes: "/enfermeria/constantes",
  conciliacion: "/enfermeria/conciliacion",
  escalas: "/enfermeria/riesgos",
  kardex: "/enfermeria/kardex",
  indicaciones: "/medico/indicaciones",
};

export function stepPath(step: string, encounterId: string): string {
  const path = STEP_PATH[step] ?? "/pacientes";
  return `${path}?ingreso=${encodeURIComponent(encounterId)}`;
}
