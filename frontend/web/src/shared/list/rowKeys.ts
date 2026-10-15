export type KeyedRow<T> = { key: string; item: T };

/** Claves derivadas del contenido; los repetidos se desambiguan por orden de aparición. */
export function keyByContent<T>(items: readonly T[], toKey: (item: T) => string): Array<KeyedRow<T>> {
  const seen = new Map<string, number>();
  return items.map((item) => {
    const base = toKey(item);
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return { key: count === 1 ? base : `${base}#${count}`, item };
  });
}

/** Claves estables para filas editables: viajan con el objeto aunque se copie al editar. */
export function createRowKeys() {
  const keys = new WeakMap<object, string>();
  let counter = 0;
  const keyOf = (item: object): string => {
    let key = keys.get(item);
    if (key === undefined) {
      counter += 1;
      key = `row-${counter}`;
      keys.set(item, key);
    }
    return key;
  };
  const carry = <T extends object>(from: object, to: T): T => {
    keys.set(to, keyOf(from));
    return to;
  };
  return { keyOf, carry };
}
