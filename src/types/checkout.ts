/**
 * Module-agnostic line passed to the unified checkout stub. Both the retail
 * CaptureCheckout flow (U1/U2) and the QSR order (U4) serialize into this
 * shape so the stub — and later the payment matrix — stays source-agnostic.
 */
export interface CheckoutLine {
  id: string;
  name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  note?: string;
}
