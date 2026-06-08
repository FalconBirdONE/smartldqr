import * as SQLite from 'expo-sqlite';

/**
 * Shared SQLite connection for the app's local data layer.
 *
 * The app ships no native code, so the `NativeModules.*Module` objects the
 * screens originally referenced are always null at runtime. These JS-side
 * stores replace them. Everything lives in one database, opened lazily and
 * exactly once: all stores (sku, basket, transaction) await this same promise,
 * so there is a single connection and a single migration pass — no racing
 * opens, no duplicated `CREATE TABLE` work.
 */

const DB_NAME = 'ldqr.db';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      await db.execAsync(`
        PRAGMA journal_mode = WAL;

        CREATE TABLE IF NOT EXISTS skus (
          sku_id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          base_name TEXT,
          price REAL NOT NULL,
          category TEXT NOT NULL,
          variants TEXT,
          stock_count INTEGER NOT NULL DEFAULT 0,
          rec_tags TEXT,
          rec_affinity TEXT,
          is_active INTEGER NOT NULL DEFAULT 1,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS basket_items (
          basket_id TEXT PRIMARY KEY NOT NULL,
          sku_id TEXT NOT NULL,
          sku_name TEXT NOT NULL,
          price REAL NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 1,
          subtotal REAL NOT NULL DEFAULT 0,
          added_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS transactions (
          transaction_id TEXT PRIMARY KEY NOT NULL,
          total_amount REAL NOT NULL,
          payment_method TEXT NOT NULL,
          basket_snapshot TEXT NOT NULL,
          item_count INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL
        );
      `);
      return db;
    })();
  }
  return dbPromise;
}

// UUID-shaped id generator shared by the stores (matches CheckoutScreen's style).
export const generateId = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r % 4) + 8;
    return v.toString(16);
  });
