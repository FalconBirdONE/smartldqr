export interface Transaction {
  transaction_id: string;
  total_amount: number;
  payment_method: string;
  basket_snapshot: string;
  item_count: number;
  created_at: string;
}
