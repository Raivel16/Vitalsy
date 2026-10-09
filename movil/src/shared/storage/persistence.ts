import type { LifeSnapshot } from '../../modules/life/lifeApp';

export interface LifePersistence {
  load(): Promise<LifeSnapshot | null>;
  save(snapshot: LifeSnapshot): Promise<void>;
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
}
