import type { SkuItem } from '@/types/sku';

import { generateId, getDb } from './db';

/**
 * Persistent SKU/inventory store backed by expo-sqlite.
 *
 * Replaces the never-registered `NativeModules.SkuModule`. The method names and
 * shapes mirror the original native contract so call sites read the same, but
 * getters return typed `SkuItem` values directly instead of JSON strings —
 * there's no IPC boundary to serialize across in JS.
 */

const ACTIVE_ORDER = 'WHERE is_active = 1 ORDER BY sort_order ASC, created_at ASC';

export const SkuStore = {
  async getAllActiveSkus(): Promise<SkuItem[]> {
    const db = await getDb();
    return db.getAllAsync<SkuItem>(`SELECT * FROM skus ${ACTIVE_ORDER}`);
  },

  async getSkusByCategory(category: string): Promise<SkuItem[]> {
    const db = await getDb();
    return db.getAllAsync<SkuItem>(
      'SELECT * FROM skus WHERE is_active = 1 AND category = ? ORDER BY sort_order ASC, created_at ASC',
      category
    );
  },

  async getSkusByRecTag(tag: string): Promise<SkuItem[]> {
    const db = await getDb();
    return db.getAllAsync<SkuItem>(
      'SELECT * FROM skus WHERE is_active = 1 AND rec_tags LIKE ? ORDER BY sort_order ASC, created_at ASC',
      `%${tag}%`
    );
  },

  async getSkuById(skuId: string): Promise<SkuItem | null> {
    const db = await getDb();
    return db.getFirstAsync<SkuItem>('SELECT * FROM skus WHERE sku_id = ?', skuId);
  },

  async insertSku(sku: Partial<SkuItem>): Promise<boolean> {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO skus
         (sku_id, name, base_name, price, category, variants,
          stock_count, rec_tags, rec_affinity, is_active, sort_order, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      sku.sku_id ?? generateId(),
      sku.name ?? '',
      sku.base_name ?? null,
      sku.price ?? 0,
      sku.category ?? '',
      sku.variants ?? null,
      sku.stock_count ?? 0,
      sku.rec_tags ?? null,
      sku.rec_affinity ?? null,
      sku.is_active ?? 1,
      sku.sort_order ?? 0,
      sku.created_at ?? new Date().toISOString()
    );
    return true;
  },

  async updateSku(sku: Partial<SkuItem>): Promise<boolean> {
    if (!sku.sku_id) return false;
    const db = await getDb();
    const result = await db.runAsync(
      `UPDATE skus
          SET name = ?, base_name = ?, price = ?, category = ?, variants = ?,
              stock_count = ?, rec_tags = ?, rec_affinity = ?, is_active = ?, sort_order = ?
        WHERE sku_id = ?`,
      sku.name ?? '',
      sku.base_name ?? null,
      sku.price ?? 0,
      sku.category ?? '',
      sku.variants ?? null,
      sku.stock_count ?? 0,
      sku.rec_tags ?? null,
      sku.rec_affinity ?? null,
      sku.is_active ?? 1,
      sku.sort_order ?? 0,
      sku.sku_id
    );
    return result.changes > 0;
  },

  async deleteSku(skuId: string): Promise<boolean> {
    const db = await getDb();
    // Soft delete: flip is_active so the row drops out of getAllActiveSkus()
    // while staying resolvable for historical transaction snapshots.
    const result = await db.runAsync('UPDATE skus SET is_active = 0 WHERE sku_id = ?', skuId);
    return result.changes > 0;
  },
};
