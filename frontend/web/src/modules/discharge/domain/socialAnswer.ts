/** «si», «Sí», «SI»…: respuesta afirmativa del campo de texto «¿Entorno adecuado?», sin distinguir tildes ni mayúsculas. */
export function isAffirmative(value: string): boolean {
  return value.trim().normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase() === "si";
}
