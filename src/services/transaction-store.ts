import { generateId, getDb } from './db';

/**
 * Persistent transaction log backed by expo-sqlite.
 *
 * Replaces the never-registered `NativeModules.TransactionModule`.
 */

type LogTransactionInput = {
  total_amount: number;
  payment_method: string;
  basket_snapshot: string;
  item_count: number;
};

export const TransactionStore = {
  /** Persist a completed transaction and return its generated id. */
  async logTransaction(input: LogTransactionInput): Promise<string> {
    const db = await getDb();
    const transactionId = generateId();
    await db.runAsync(
      `INSERT INTO transactions
         (transaction_id, total_amount, payment_method, basket_snapshot, item_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      transactionId,
      input.total_amount,
      input.payment_method,
      input.basket_snapshot,
      input.item_count,
      new Date().toISOString()
    );
    return transactionId;
  },
};
