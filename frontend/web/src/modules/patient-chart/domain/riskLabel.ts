/** Quita la frase de riesgo repetida que a veces trae el texto de las escalas. */
export function cleanRiskLabel(value?: string | null): string {
  if (!value) return "—";
  // `(?<!\s)` ancla cada coincidencia al inicio de una racha de espacios y evita
  // el retroceso cuadrático sobre textos con muchos espacios seguidos.
  return value
    .replace(/(?<!\s)\s+de caídas(?=\s+de caídas)/gi, "")
    .replace(/(?<!\s)\s+de úlceras por presión(?=\s+de úlceras)/gi, "")
    .replace(/(?<!\s)\s+de caída:(?=\s+de caída:)/gi, "")
    .replace(/(?<!\s)\s+de úlcera por presión:(?=\s+de úlcera)/gi, "")
    .trim();
}
