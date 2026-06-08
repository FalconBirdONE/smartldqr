import type { BasketItem } from '@/types/basket';
import type { SkuItem } from '@/types/sku';

import { generateId, getDb } from './db';

/**
 * Persistent basket store backed by expo-sqlite.
 *
 * Replaces the never-registered `NativeModules.BasketModule`. Getters return
 * typed values directly instead of JSON strings.
 */
export const BasketStore = {
  /**
   * Add a SKU to the basket. If the SKU is already present, bump its quantity
   * instead of creating a duplicate line, and recompute the subtotal from the
   * line's own price so it stays internally consistent.
   */
  async addItem(sku: Partial<SkuItem>): Promise<boolean> {
    const db = await getDb();
    const price = sku.price ?? 0;

    const existing = sku.sku_id
      ? await db.getFirstAsync<BasketItem>('SELECT * FROM basket_items WHERE sku_id = ?', sku.sku_id)
      : null;

    if (existing) {
      const quantity = existing.quantity + 1;
      await db.runAsync(
        'UPDATE basket_items SET quantity = ?, subtotal = ? WHERE basket_id = ?',
        quantity,
        existing.price * quantity,
        existing.basket_id
      );
      return true;
    }

    await db.runAsync(
      `INSERT INTO basket_items
         (basket_id, sku_id, sku_name, price, quantity, subtotal, added_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      generateId(),
      sku.sku_id ?? '',
      sku.name ?? '',
      price,
      1,
      price,
      new Date().toISOString()
    );
    return true;
  },

  async getBasketItems(): Promise<BasketItem[]> {
    const db = await getDb();
    return db.getAllAsync<BasketItem>('SELECT * FROM basket_items ORDER BY added_at ASC');
  },

  async getBasketTotal(): Promise<number> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ total: number | null }>(
      'SELECT SUM(subtotal) AS total FROM basket_items'
    );
    return row?.total ?? 0;
  },

  async clearBasket(): Promise<boolean> {
    const db = await getDb();
    await db.runAsync('DELETE FROM basket_items');
    return true;
  },
};
