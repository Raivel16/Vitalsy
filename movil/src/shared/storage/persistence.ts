import type { LifeSnapshot } from '../../modules/life/lifeApp';

export interface LifePersistence {
  load(): Promise<LifeSnapshot | null>;
  save(snapshot: LifeSnapshot): Promise<void>;
  /**
   * Lee-modifica-escribe de forma atómica: `mutate` recibe lo ÚLTIMO guardado y devuelve el nuevo
   * valor (o null para no tocar nada). Dos escritores no se pisan: el segundo ve lo del primero.
   */
  update(mutate: (current: LifeSnapshot | null) => LifeSnapshot | null): Promise<void>;
}

export class MemoryPersistence implements LifePersistence {
  constructor(private snapshot: LifeSnapshot | null = null) {}

  load(): Promise<LifeSnapshot | null> {
    return Promise.resolve(this.snapshot);
  }

  save(snapshot: LifeSnapshot): Promise<void> {
    this.snapshot = snapshot;
    return Promise.resolve();
  }

  update(mutate: (current: LifeSnapshot | null) => LifeSnapshot | null): Promise<void> {
    const next = mutate(this.snapshot);
    if (next) {
      this.snapshot = next;
    }
    return Promise.resolve();
  }
}
