import { useCallback, useState } from 'react';
import { type Href, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import {
  cardShadow,
  eyebrowStyle,
  Palette,
  Radius,
  SCREEN_GUTTER,
  Space,
  Type,
} from '@/constants/design';
import { useResponsive } from '@/hooks/use-responsive';
import type { CheckoutLine } from '@/types/checkout';

/**
 * CashierBillingScreen — cashier-led ("attended counter") billing.
 *
 * Self-contained simulation: the cashier rings items with a physical scanner
 * (here a "Scan Item" button that picks a random SKU) onto a live bill; a
 * dynamic UPI QR on the right regenerates on every basket change so the
 * customer always scans the current total. No Room/SQLite here — the catalog
 * is hardcoded for the demo.
 *
 * Payment is simulated: "Simulate Payment using UPI" navigates straight to the
 * shared confirmation page. A "Pay Using Alternative Options" button hands the
 * bill off to the full payment matrix (RuPay / EMI / UPI box).
 *
 * Layout: 55 / 45 two-column on the landscape tablet, single column on phone
 * (phone keeps the existing stacked behaviour — all tablet styling is gated
 * behind `isTablet`).
 */

const MOCK_SKUS = [
  { sku_id: 'SKU_001', name: 'Masala Chai', price: 20 },
  { sku_id: 'SKU_002', name: 'Samosa (2pc)', price: 30 },
  { sku_id: 'SKU_003', name: 'Vada Pav', price: 25 },
  { sku_id: 'SKU_004', name: 'Cold Coffee', price: 60 },
  { sku_id: 'SKU_005', name: 'Butter Toast', price: 35 },
] as const;

type Sku = (typeof MOCK_SKUS)[number];

type BillLine = {
  sku_id: string;
  name: string;
  price: number;
  qty: number;
};

// Merchant identity baked into the UPI intent for this demo counter.
const MERCHANT_VPA = 'merchant@upi';
const MERCHANT_NAME = 'MerchantName';

/** Short, txn-shaped id used in the UPI note (tn=LDQR-{txnId}). */
function generateTxnId(): string {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

/** Build the UPI deep-link the QR encodes. Recomputed every render (no memo). */
function buildUpiUri(total: number, txnId: string): string {
  return (
    `upi://pay?pa=${MERCHANT_VPA}` +
    `&pn=${MERCHANT_NAME}` +
    `&am=${total.toFixed(2)}` +
    `&cu=INR` +
    `&tn=LDQR-${txnId}`
  );
}

export default function CashierBillingScreen() {
  const router = useRouter();
  const { isTablet } = useResponsive();

  const [lines, setLines] = useState<BillLine[]>([]);
  const [txnId, setTxnId] = useState<string>(generateTxnId);

  const total = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  const isEmpty = lines.length === 0;

  // Simulate the counter scanner firing: pick a random SKU, bump its qty if it
  // is already on the bill, otherwise append a new line.
  const scanItem = useCallback(() => {
    const sku: Sku = MOCK_SKUS[Math.floor(Math.random() * MOCK_SKUS.length)];
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.sku_id === sku.sku_id);
      if (idx === -1) {
        return [...prev, { sku_id: sku.sku_id, name: sku.name, price: sku.price, qty: 1 }];
      }
      const next = [...prev];
      next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
      return next;
    });
  }, []);

  const clearBill = useCallback(() => {
    setLines([]);
    setTxnId(generateTxnId());
  }, []);

  // Map the live bill to the module-agnostic line shape the checkout expects.
  const toCheckoutLines = useCallback(
    (): CheckoutLine[] =>
      lines.map((l) => ({
        id: l.sku_id,
        name: l.name,
        quantity: l.qty,
        unit_price: l.price,
        subtotal: l.price * l.qty,
      })),
    [lines]
  );

  // Simulate a straight UPI payment: go directly to the shared confirmation
  // page (no palm step). `replace` so Back doesn't land on a stale paid bill.
  const simulateUpiPayment = useCallback(() => {
    if (isEmpty) return;
    router.replace({
      pathname: '/confirmation',
      params: {
        transaction_id: `LDQR-${txnId}`,
        total_amount: String(total),
        timestamp: new Date().toISOString(),
        method: 'UPI',
        app: 'UPI',
      },
    });
  }, [isEmpty, txnId, total, router]);

  // Hand the live bill to the full payment matrix (RuPay / EMI / UPI box).
  const payAlternative = useCallback(() => {
    if (isEmpty) return;
    // Cast: new route; the typed-routes manifest picks it up on next regen.
    router.push({
      pathname: '/checkout-stub',
      params: { source: 'retail', total: String(total), basket: JSON.stringify(toCheckoutLines()) },
    } as unknown as Href);
  }, [isEmpty, total, toCheckoutLines, router]);

  // Recomputed each render so the QR always reflects the live total — never cached.
  const upiUri = buildUpiUri(total, txnId);

  /* ----------------------------- LEFT: live bill ---------------------------- */
  const billPanel = (
    <View style={[styles.panel, isTablet && styles.leftPanelTablet]}>
      <Text style={styles.eyebrow}>Cashier billing</Text>
      <Text style={styles.panelTitle}>Live bill</Text>

      <View style={styles.billHeaderRow}>
        <Text style={[styles.colName, styles.colHead]}>Item</Text>
        <Text style={[styles.colQty, styles.colHead]}>Qty</Text>
        <Text style={[styles.colUnit, styles.colHead]}>Unit</Text>
        <Text style={[styles.colLine, styles.colHead]}>Total</Text>
      </View>

      <ScrollView
        style={styles.billScroll}
        contentContainerStyle={styles.billScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {isEmpty ? (
          <View style={styles.emptyBill}>
            <Text style={styles.emptyBillText}>No items yet</Text>
            <Text style={styles.emptyBillHint}>Tap “Scan Item” to ring up the bill.</Text>
          </View>
        ) : (
          lines.map((l) => (
            <View key={l.sku_id} style={styles.billRow}>
              <Text style={styles.colName} numberOfLines={1}>
                {l.name}
              </Text>
              <Text style={styles.colQty}>×{l.qty}</Text>
              <Text style={styles.colUnit}>₹{l.price}</Text>
              <Text style={styles.colLine}>₹{(l.price * l.qty).toLocaleString('en-IN')}</Text>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>₹{total.toLocaleString('en-IN')}</Text>
      </View>

      <View style={styles.billActions}>
        <Pressable
          onPress={scanItem}
          style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && styles.btnPressed]}
        >
          <Text style={styles.btnPrimaryText}>Scan Item</Text>
        </Pressable>
        <Pressable
          onPress={clearBill}
          disabled={isEmpty}
          style={({ pressed }) => [
            styles.btn,
            styles.btnGhost,
            isEmpty && styles.btnDisabled,
            pressed && styles.btnPressed,
          ]}
        >
          <Text style={[styles.btnGhostText, isEmpty && styles.btnDisabledText]}>Clear Bill</Text>
        </Pressable>
      </View>
    </View>
  );

  /* --------------------------- RIGHT: dynamic QR ---------------------------- */
  const qrPanel = (
    <View style={[styles.panel, styles.qrPanel, isTablet && styles.rightPanelTablet]}>
      <View style={[styles.statusPill, styles.statusAwaiting]}>
        <View style={[styles.statusDot, styles.statusDotAwaiting]} />
        <Text style={[styles.statusText, styles.statusTextAwaiting]}>AWAITING PAYMENT</Text>
      </View>

      <View style={styles.qrBox}>
        <QRCode
          value={isEmpty ? buildUpiUri(0, txnId) : upiUri}
          size={isTablet ? 220 : 184}
          color={Palette.ink}
          backgroundColor="#FFFFFF"
        />
      </View>

      {isEmpty ? (
        <Text style={styles.qrPlaceholderLabel}>Add items to generate QR</Text>
      ) : (
        <>
          <Text style={styles.qrAmountLabel}>Scan to pay</Text>
          <Text style={styles.qrAmount}>₹{total.toLocaleString('en-IN')}</Text>
          <Text style={styles.qrTxn}>Txn LDQR-{txnId}</Text>
          <Text style={styles.qrVpa}>{MERCHANT_VPA}</Text>
        </>
      )}

      <Pressable
        onPress={simulateUpiPayment}
        disabled={isEmpty}
        style={({ pressed }) => [
          styles.btn,
          styles.fullBtn,
          styles.simulateBtn,
          isEmpty && styles.btnDisabled,
          pressed && styles.btnPressed,
        ]}
      >
        <Text style={[styles.btnPrimaryText, isEmpty && styles.btnDisabledText]}>
          Simulate Payment using UPI
        </Text>
      </Pressable>

      <Pressable
        onPress={payAlternative}
        disabled={isEmpty}
        style={({ pressed }) => [
          styles.btn,
          styles.fullBtn,
          styles.altBtn,
          isEmpty && styles.btnDisabled,
          pressed && styles.btnPressed,
        ]}
      >
        <Text style={[styles.altBtnText, isEmpty && styles.btnDisabledText]}>
          Pay Using Alternative Options
        </Text>
      </Pressable>
    </View>
  );

  return (
    <View style={styles.root}>
      <View style={[styles.body, isTablet ? styles.bodyRow : styles.bodyColumn]}>
        {billPanel}
        {qrPanel}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  body: {
    flex: 1,
    padding: SCREEN_GUTTER,
    gap: SCREEN_GUTTER,
  },
  bodyRow: {
    flexDirection: 'row',
  },
  bodyColumn: {
    flexDirection: 'column',
  },

  panel: {
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    padding: Space.xl,
    ...cardShadow,
  },
  // 55 / 45 split on tablet.
  leftPanelTablet: {
    flex: 55,
  },
  rightPanelTablet: {
    flex: 45,
  },

  eyebrow: eyebrowStyle,
  panelTitle: {
    fontSize: Type.title,
    fontWeight: '800',
    color: Palette.ink,
    marginTop: Space.xs,
    marginBottom: Space.lg,
  },

  /* Bill table */
  billHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: Space.sm,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  colHead: {
    fontSize: Type.micro,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: Palette.inkMuted,
  },
  billScroll: {
    flex: 1,
  },
  billScrollContent: {
    flexGrow: 1,
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Space.md,
    borderBottomWidth: 1,
    borderBottomColor: Palette.cardMuted,
  },
  colName: {
    flex: 1,
    fontSize: Type.body,
    color: Palette.ink,
    fontWeight: '600',
  },
  colQty: {
    width: 56,
    textAlign: 'center',
    fontSize: Type.body,
    color: Palette.inkSecondary,
  },
  colUnit: {
    width: 72,
    textAlign: 'right',
    fontSize: Type.body,
    color: Palette.inkSecondary,
  },
  colLine: {
    width: 88,
    textAlign: 'right',
    fontSize: Type.body,
    color: Palette.ink,
    fontWeight: '700',
  },

  emptyBill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Space.xxxl,
    gap: Space.xs,
  },
  emptyBillText: {
    fontSize: Type.heading,
    fontWeight: '700',
    color: Palette.inkSecondary,
  },
  emptyBillHint: {
    fontSize: Type.bodySmall,
    color: Palette.inkMuted,
  },

  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: Space.lg,
    paddingTop: Space.lg,
    borderTopWidth: 2,
    borderTopColor: Palette.borderStrong,
  },
  totalLabel: {
    fontSize: Type.heading,
    fontWeight: '700',
    color: Palette.inkSecondary,
  },
  totalValue: {
    fontSize: Type.amount,
    fontWeight: '800',
    letterSpacing: -1,
    color: Palette.ink,
  },

  billActions: {
    flexDirection: 'row',
    gap: Space.md,
    marginTop: Space.xl,
  },

  /* Buttons */
  btn: {
    flex: 1,
    height: 56,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullBtn: {
    width: '100%',
    flex: 0,
  },
  btnPressed: {
    opacity: 0.85,
  },
  btnPrimary: {
    backgroundColor: Palette.amber,
  },
  btnPrimaryText: {
    fontSize: Type.body,
    fontWeight: '800',
    color: Palette.onColor,
  },
  btnGhost: {
    backgroundColor: Palette.cardMuted,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  btnGhostText: {
    fontSize: Type.body,
    fontWeight: '700',
    color: Palette.inkSecondary,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnDisabledText: {
    color: Palette.inkMuted,
  },

  /* QR panel */
  qrPanel: {
    alignItems: 'center',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    paddingVertical: Space.sm,
    paddingHorizontal: Space.lg,
    borderRadius: Radius.pill,
    marginBottom: Space.xl,
  },
  statusAwaiting: {
    backgroundColor: Palette.amberSoft,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotAwaiting: {
    backgroundColor: Palette.amberStrong,
  },
  statusText: {
    fontSize: Type.caption,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statusTextAwaiting: {
    color: Palette.amberInk,
  },

  qrBox: {
    padding: Space.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  qrPlaceholderLabel: {
    fontSize: Type.body,
    color: Palette.inkMuted,
    fontWeight: '600',
    marginTop: Space.lg,
    textAlign: 'center',
  },
  qrAmountLabel: {
    fontSize: Type.bodySmall,
    color: Palette.inkSecondary,
    fontWeight: '600',
    marginTop: Space.lg,
  },
  qrAmount: {
    fontSize: Type.amount,
    fontWeight: '800',
    letterSpacing: -1,
    color: Palette.ink,
    marginTop: Space.xs,
  },
  qrTxn: {
    fontSize: Type.bodySmall,
    color: Palette.inkSecondary,
    fontFamily: 'monospace',
    marginTop: Space.sm,
  },
  qrVpa: {
    fontSize: Type.caption,
    color: Palette.inkMuted,
    marginTop: Space.xs,
  },
  simulateBtn: {
    backgroundColor: Palette.green,
    marginTop: Space.xl,
  },
  altBtn: {
    backgroundColor: Palette.cardMuted,
    borderWidth: 1.5,
    borderColor: Palette.borderStrong,
    marginTop: Space.md,
  },
  altBtnText: {
    fontSize: Type.body,
    fontWeight: '700',
    color: Palette.ink,
  },
});
