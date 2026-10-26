// Personas sembradas por DemoPeopleSeeder (enfermeras de piso de Medicina Interna A).
export const NURSES = {
  rosa: "rosa.quispe@vitalsy.local",
  lucia: "lucia.mendoza@vitalsy.local",
  carmen: "carmen.huaman@vitalsy.local",
  patricia: "patricia.salas@vitalsy.local",
  elena: "elena.vargas@vitalsy.local",
  mariela: "mariela.torres@vitalsy.local",
} as const;

export const UNIT = "Medicina Interna A";

/** Instante UTC de un día futuro fijo (cada archivo usa su propio mes para no pisar otro rol). */
export function utc(date: string, time = "00:00"): Date {
  return new Date(`${date}T${time}:00Z`);
}
