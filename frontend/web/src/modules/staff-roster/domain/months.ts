/** Meses seleccionables en la matriz: el actual más los publicados, del más reciente al más antiguo. */
export function orderMonthOptions(current: string, plans: ReadonlyArray<{ yearMonth: string }>): string[] {
  const unique = new Set<string>([current, ...plans.map((item) => item.yearMonth)]);
  return [...unique].sort((a, b) => b.localeCompare(a));
}
