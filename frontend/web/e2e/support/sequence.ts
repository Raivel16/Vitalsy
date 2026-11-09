/**
 * Ejecuta `run` sobre cada elemento uno tras otro (nunca en paralelo). Los pasos de un flujo clínico y las
 * acciones sobre un mismo formulario dependen del orden, por eso no pueden ir en `Promise.all`.
 */
export function sequentially<T>(items: readonly T[], run: (item: T, index: number) => Promise<unknown>): Promise<void> {
  return items.reduce<Promise<unknown>>((previous, item, index) => previous.then(() => run(item, index)), Promise.resolve()).then(() => undefined);
}
