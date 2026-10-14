import * as SQLite from 'expo-sqlite';
import type { LifeSnapshot } from '../../modules/life/lifeApp';
import { openJson, sealJson } from '../crypto/seal';
import type { LifePersistence } from './persistence';

type Database = Awaited<ReturnType<typeof SQLite.openDatabaseAsync>>;

export class SqlitePersistence implements LifePersistence {
  constructor(
    private readonly database: Database,
    private readonly key: Uint8Array,
    private readonly nonce: () => Uint8Array,
  ) {}

  static async open(database: Database, key: Uint8Array, nonce: () => Uint8Array): Promise<SqlitePersistence> {
    await database.execAsync(
      'CREATE TABLE IF NOT EXISTS vault (id INTEGER PRIMARY KEY CHECK (id = 1), payload TEXT NOT NULL);',
    );
    return new SqlitePersistence(database, key, nonce);
  }

  async load(): Promise<LifeSnapshot | null> {
    const row = await this.database.getFirstAsync<{ payload: string }>('SELECT payload FROM vault WHERE id = 1');
    if (!row) {
      return null;
    }
    return JSON.parse(openJson(row.payload, this.key)) as LifeSnapshot;
  }

  async update(mutate: (current: LifeSnapshot | null) => LifeSnapshot | null): Promise<void> {
    // Transacción exclusiva: otra conexión (la tarea en segundo plano) espera y luego ve lo ya escrito.
    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      const row = await transaction.getFirstAsync<{ payload: string }>('SELECT payload FROM vault WHERE id = 1');
      const current = row ? (JSON.parse(openJson(row.payload, this.key)) as LifeSnapshot) : null;
      const next = mutate(current);
      if (next) {
        const payload = sealJson(JSON.stringify(next), this.key, this.nonce());
        await transaction.runAsync('INSERT OR REPLACE INTO vault (id, payload) VALUES (1, ?)', payload);
      }
    });
  }

  async save(snapshot: LifeSnapshot): Promise<void> {
    const payload = sealJson(JSON.stringify(snapshot), this.key, this.nonce());
    await this.database.runAsync('INSERT OR REPLACE INTO vault (id, payload) VALUES (1, ?)', payload);
  }
}
