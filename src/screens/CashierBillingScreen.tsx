import { useCallback, useEffect, useMemo, useState } from 'react';
import { type Href, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PaymentMatrix } from '@/components/ldqr/payment-matrix';
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
 * Left: the live bill, rung up with a simulated scanner ("Scan Item"), plus a
 * Loyalty Programs entry and a collapsible Simulation Controls panel for demos.
 * Right: the shared `PaymentMatrix` (UPI QR + payment options) — identical to
 * the unified checkout, so payment logic lives in one place.
 *
 * Layout: two columns on the landscape tablet, single column on phone.
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

const generateTxnId = () => Math.random().toString(36).slice(2, 10).toUpperCase();

export default function CashierBillingScreen() {
  const router = useRouter();
  const { isTablet } = useResponsive();
  const insets = useSafeAreaInsets();

  const [lines, setLines] = useState<BillLine[]>([]);
  const [simOpen, setSimOpen] = useState(false);
  const [extModalVisible, setExtModalVisible] = useState(false);

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

  const clearBill = useCallback(() => setLines([]), []);

  // Module-agnostic line shape the shared payment surface + Tap & Pay expect.
  const checkoutLines = useMemo<CheckoutLine[]>(
    () =>
      lines.map((l) => ({
        id: l.sku_id,
        name: l.name,
        quantity: l.qty,
        unit_price: l.price,
        subtotal: l.price * l.qty,
      })),
    [lines]
  );

  // ── Simulation controls ──────────────────────────────────────────────────
  const goToConfirmation = useCallback(
    (method: string, app: string) => {
      if (isEmpty) return;
      router.replace({
        pathname: '/confirmation',
        params: {
          transaction_id: `LDQR-${generateTxnId()}`,
          total_amount: String(total),
          timestamp: new Date().toISOString(),
          method,
          app,
        },
      });
    },
    [isEmpty, total, router]
  );

  const simulateTapAndPay = useCallback(() => {
    if (isEmpty) return;
    // Cast: new route; the typed-routes manifest picks it up on next regen.
    router.push({
      pathname: '/tap-and-pay',
      params: { source: 'retail', total: String(total), basket: JSON.stringify(checkoutLines) },
    } as unknown as Href);
  }, [isEmpty, total, checkoutLines, router]);

  // External device: show the connecting modal, then auto-advance after 2s.
  useEffect(() => {
    if (!extModalVisible) return;
    const id = setTimeout(() => {
      setExtModalVisible(false);
      goToConfirmation('External Terminal', 'External device');
    }, 2000);
    return () => clearTimeout(id);
  }, [extModalVisible, goToConfirmation]);

  /* ----------------------------- LEFT: live bill ---------------------------- */
  const billPanel = (
    <View style={styles.panel}>
      <Text style={styles.eyebrow}>Cashier billing</Text>
      <Text style={styles.panelTitle}>Live bill</Text>

      <View style={styles.billHeaderRow}>
        <Text style={[styles.colName, styles.colHead]}>Item</Text>
        <Text style={[styles.colQty, styles.colHead]}>Qty</Text>
        <Text style={[styles.colUnit, styles.colHead]}>Unit</Text>
        <Text style={[styles.colLine, styles.colHead]}>Total</Text>
      </View>

      {/* Rendered inline (no nested scroll) so the whole column scrolls as one
          unit and never clips when the device rotates to a short landscape. */}
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

  const loyaltyButton = (
    <Pressable
      onPress={() => router.push('/loyalty-programs' as Href)}
      style={({ pressed }) => [styles.loyaltyBtn, pressed && styles.btnPressed]}
    >
      <Text style={styles.loyaltyIcon}>♥</Text>
      <View style={styles.flex}>
        <Text style={styles.loyaltyTitle}>Loyalty Programs</Text>
        <Text style={styles.loyaltySub}>Points & rewards</Text>
      </View>
      <Text style={styles.loyaltyArrow}>›</Text>
    </Pressable>
  );

  const simControls = (
    <View style={styles.simCard}>
      <Pressable style={styles.simHeader} onPress={() => setSimOpen((v) => !v)}>
        <Text style={styles.eyebrow}>Simulation Controls</Text>
        <Text style={styles.simChevron}>{simOpen ? '▾' : '▸'}</Text>
      </Pressable>

      {simOpen ? (
        <View style={styles.simBody}>
          <Pressable
            onPress={() => goToConfirmation('UPI', 'UPI')}
            disabled={isEmpty}
            style={({ pressed }) => [
              styles.simBtn,
              isEmpty && styles.btnDisabled,
              pressed && styles.btnPressed,
            ]}
          >
            <Text style={styles.simBtnText}>Simulate UPI Payment</Text>
          </Pressable>

          <Pressable
            onPress={simulateTapAndPay}
            disabled={isEmpty}
            style={({ pressed }) => [
              styles.simBtn,
              isEmpty && styles.btnDisabled,
              pressed && styles.btnPressed,
            ]}
          >
            <Text style={styles.simBtnText}>Simulate Tap &amp; Pay</Text>
          </Pressable>

          <Pressable
            onPress={() => !isEmpty && setExtModalVisible(true)}
            disabled={isEmpty}
            style={({ pressed }) => [
              styles.simBtn,
              isEmpty && styles.btnDisabled,
              pressed && styles.btnPressed,
            ]}
          >
            <Text style={styles.simBtnText}>Simulate External Device</Text>
            <View style={styles.simBadge}>
              <Text style={styles.simBadgeText}>SIM</Text>
            </View>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  const leftContent = (
    <>
      {billPanel}
      {loyaltyButton}
      {simControls}
    </>
  );

  const rightContent = (
    <PaymentMatrix lines={checkoutLines} total={total} source="retail" />
  );

  return (
    <View style={styles.root}>
      {isTablet ? (
        <View
          style={[
            styles.bodyRow,
            {
              paddingTop: insets.top + SCREEN_GUTTER,
              paddingLeft: insets.left + SCREEN_GUTTER,
              paddingRight: insets.right + SCREEN_GUTTER,
            },
          ]}
        >
          <ScrollView
            style={styles.colLeft}
            contentContainerStyle={[styles.colScroll, { paddingBottom: insets.bottom + SCREEN_GUTTER }]}
            showsVerticalScrollIndicator={false}
          >
            {leftContent}
          </ScrollView>
          <ScrollView
            style={styles.colRight}
            contentContainerStyle={[styles.colScroll, { paddingBottom: insets.bottom + SCREEN_GUTTER }]}
            showsVerticalScrollIndicator={false}
          >
            {rightContent}
          </ScrollView>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.colPhone,
            {
              paddingTop: insets.top + SCREEN_GUTTER,
              paddingBottom: insets.bottom + SCREEN_GUTTER,
              paddingLeft: insets.left + SCREEN_GUTTER,
              paddingRight: insets.right + SCREEN_GUTTER,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {leftContent}
          {rightContent}
        </ScrollView>
      )}

      {/* External payment terminal — connecting, then auto-advances. */}
      <Modal visible={extModalVisible} transparent animationType="fade" onRequestClose={() => setExtModalVisible(false)}>
        <View style={styles.modalScrim}>
          <View style={styles.modalCard}>
            <ActivityIndicator size="large" color={Palette.indigo} />
            <Text style={styles.modalText}>Connecting to external payment terminal…</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.canvas },

  bodyRow: { flex: 1, flexDirection: 'row', gap: SCREEN_GUTTER },
  colLeft: { flex: 55 },
  colRight: { flex: 45 },
  colScroll: { gap: Space.lg },
  colPhone: { gap: Space.lg },

  panel: {
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    padding: Space.xl,
    ...cardShadow,
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
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Space.md,
    borderBottomWidth: 1,
    borderBottomColor: Palette.cardMuted,
  },
  colName: { flex: 1, fontSize: Type.body, color: Palette.ink, fontWeight: '600' },
  colQty: { width: 56, textAlign: 'center', fontSize: Type.body, color: Palette.inkSecondary },
  colUnit: { width: 72, textAlign: 'right', fontSize: Type.body, color: Palette.inkSecondary },
  colLine: { width: 88, textAlign: 'right', fontSize: Type.body, color: Palette.ink, fontWeight: '700' },

  emptyBill: { alignItems: 'center', justifyContent: 'center', minHeight: 160, gap: Space.xs },
  emptyBillText: { fontSize: Type.heading, fontWeight: '700', color: Palette.inkSecondary },
  emptyBillHint: { fontSize: Type.bodySmall, color: Palette.inkMuted },

  totalRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginTop: Space.lg,
    paddingTop: Space.lg,
    borderTopWidth: 2,
    borderTopColor: Palette.borderStrong,
  },
  totalLabel: { fontSize: Type.heading, fontWeight: '700', color: Palette.inkSecondary },
  totalValue: { fontSize: Type.amount, fontWeight: '800', letterSpacing: -1, color: Palette.ink },

  billActions: { flexDirection: 'row', gap: Space.md, marginTop: Space.xl },

  /* Buttons */
  btn: { flex: 1, height: 56, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  btnPressed: { opacity: 0.85 },
  btnPrimary: { backgroundColor: Palette.amber },
  btnPrimaryText: { fontSize: Type.body, fontWeight: '800', color: Palette.onColor },
  btnGhost: { backgroundColor: Palette.cardMuted, borderWidth: 1, borderColor: Palette.border },
  btnGhostText: { fontSize: Type.body, fontWeight: '700', color: Palette.inkSecondary },
  btnDisabled: { opacity: 0.4 },
  btnDisabledText: { color: Palette.inkMuted },
  flex: { flex: 1 },

  /* Loyalty entry */
  loyaltyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    backgroundColor: Palette.pinkSoft,
    borderRadius: Radius.lg,
    padding: Space.lg,
  },
  loyaltyIcon: { fontSize: Type.title, color: Palette.pink },
  loyaltyTitle: { fontSize: Type.body, fontWeight: '700', color: Palette.pinkInk },
  loyaltySub: { fontSize: Type.caption, color: Palette.pink, marginTop: 1 },
  loyaltyArrow: { fontSize: Type.title, fontWeight: '700', color: Palette.pink },

  /* Simulation controls */
  simCard: {
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    padding: Space.lg,
    ...cardShadow,
  },
  simHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  simChevron: { fontSize: Type.body, color: Palette.inkSecondary },
  simBody: { gap: Space.md, marginTop: Space.lg },
  simBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.sm,
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Palette.cardMuted,
    borderWidth: 1.5,
    borderColor: Palette.borderStrong,
  },
  simBtnText: { fontSize: Type.body, fontWeight: '700', color: Palette.ink },
  simBadge: {
    backgroundColor: Palette.amber,
    borderRadius: Radius.sm,
    paddingHorizontal: Space.sm,
    paddingVertical: 2,
  },
  simBadgeText: { fontSize: Type.micro, fontWeight: '800', color: '#3B2400', letterSpacing: 0.5 },

  /* External device modal */
  modalScrim: { flex: 1, backgroundColor: Palette.scrim, alignItems: 'center', justifyContent: 'center', padding: Space.xl },
  modalCard: {
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    padding: Space.xxl,
    alignItems: 'center',
    gap: Space.lg,
    maxWidth: 360,
  },
  modalText: { fontSize: Type.body, fontWeight: '600', color: Palette.ink, textAlign: 'center' },
});
