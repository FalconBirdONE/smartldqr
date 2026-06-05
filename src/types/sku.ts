export interface SkuItem {
  sku_id: string;
  name: string;
  base_name?: string;
  price: number;
  category: string;
  variants?: string;
  stock_count?: number;
  rec_tags?: string;
  rec_affinity?: string;
  is_active?: number;
  sort_order?: number;
  created_at?: string;
}
