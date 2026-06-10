import { useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Eyebrow } from '@/components/ldqr/eyebrow';
import { PrimaryButton } from '@/components/ldqr/primary-button';
import { TrustChip } from '@/components/ldqr/trust-chip';
import { cardShadow, Palette, Radius, SCREEN_GUTTER, Space, Type, UPI_LITE_LIMIT } from '@/constants/design';
import { REVIEW_UPSELLS } from '@/constants/qsr-menu';
import { lineNote, lineUnitPrice, useQsrOrder } from '@/context/qsr-order';
import type { CheckoutLine } from '@/types/checkout';

const TIPS = [0, 10, 20, 30];

export default function QsrReview() {
  const router = useRouter();
  const order = useQsrOrder();

  const isLite = order.total > 0 && order.total < UPI_LITE_LIMIT;

  // Billing is done once the total below is computed; hand the order to the
  // unified checkout stub as a basket. No payment-method gating here — every
  // method is available there, not just UPI Lite.
  const checkout = () => {
    if (order.itemCount === 0) return;
    const lines: CheckoutLine[] = order.lines.map((l) => ({
      id: l.lineId,
      name: l.item.name,
      quantity: l.qty,
      unit_price: lineUnitPrice(l),
      subtotal: lineUnitPrice(l) * l.qty,
      note: lineNote(l),
    }));
    if (order.packing > 0) {
      lines.push({ id: 'packing', name: 'Packing', quantity: 1, unit_price: order.packing, subtotal: order.packing });
    }
    if (order.tip > 0) {
      lines.push({ id: 'tip', name: 'Tip', quantity: 1, unit_price: order.tip, subtotal: order.tip });
    }
    router.push({
      pathname: '/checkout-stub',
      params: { source: 'qsr', total: String(order.total), basket: JSON.stringify(lines) },
    } as unknown as Href);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>‹ Menu</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Review order</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Order lines */}
        <View style={styles.card}>
          <Eyebrow>Your order</Eyebrow>
          {order.lines.map((l) => {
            const note = lineNote(l);
            return (
              <View key={l.lineId} style={styles.line}>
                <Text style={styles.lineQty}>{l.qty}×</Text>
                <View style={styles.flex}>
                  <Text style={styles.lineName}>{l.item.name}</Text>
                  {note ? <Text style={styles.lineNote}>{note}</Text> : null}
                </View>
                <Text style={styles.linePrice}>₹{lineUnitPrice(l) * l.qty}</Text>
              </View>
            );
          })}
          {order.lines.length === 0 ? (
            <Text style={styles.empty}>Your order is empty.</Text>
          ) : null}
        </View>

        {/* Last-chance quick-add upsells */}
        <View style={styles.card}>
          <Eyebrow color={Palette.teal}>You might also like · quick add</Eyebrow>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.upsellRow}>
            {REVIEW_UPSELLS.map((u) => (
              <Pressable key={u.id} style={styles.upsell} onPress={() => order.addLine(u)}>
                <Text style={styles.upsellEmoji}>{u.emoji}</Text>
                <Text style={styles.upsellName}>{u.name}</Text>
                <Text style={styles.upsellPrice}>+₹{u.price}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Dine-in vs take-away */}
        <View style={styles.card}>
          <Eyebrow>Where are you eating?</Eyebrow>
          <View style={styles.segment}>
            <Pressable
              style={[styles.segBtn, order.dineIn && styles.segBtnActive]}
              onPress={() => order.setDineIn(true)}
            >
              <Text style={[styles.segText, order.dineIn && styles.segTextActive]}>🍽️  Dine-in</Text>
              <Text style={styles.segSub}>No packing charge</Text>
            </Pressable>
            <Pressable
              style={[styles.segBtn, !order.dineIn && styles.segBtnActive]}
              onPress={() => order.setDineIn(false)}
            >
              <Text style={[styles.segText, !order.dineIn && styles.segTextActive]}>🛍️  Take-away</Text>
              <Text style={styles.segSub}>+ packing · GST applies</Text>
            </Pressable>
          </View>
        </View>

        {/* Optional tip */}
        <View style={styles.card}>
          <Eyebrow>Add a tip? · optional</Eyebrow>
          <View style={styles.tipRow}>
            {TIPS.map((t) => (
              <Pressable
                key={t}
                style={[styles.tipChip, order.tip === t && styles.tipChipActive]}
                onPress={() => order.setTip(t)}
              >
                <Text style={[styles.tipText, order.tip === t && styles.tipTextActive]}>
                  {t === 0 ? 'No tip' : `₹${t}`}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Totals */}
        <View style={styles.card}>
          <Row label="Subtotal" value={`₹${order.subtotal}`} />
          {order.packing > 0 ? <Row label="Packing" value={`₹${order.packing}`} /> : null}
          {order.tip > 0 ? <Row label="Tip" value={`₹${order.tip}`} /> : null}
          <Text style={styles.gst}>GST included</Text>
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{order.total}</Text>
          </View>
          {isLite ? (
            <View style={styles.liteChip}>
              <TrustChip label="UPI Lite eligible · no PIN under ₹500" tone="teal" icon="⚡" />
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={styles.payBar}>
        <View>
          <Text style={styles.payTotalLabel}>Total</Text>
          <Text style={styles.payTotal}>₹{order.total}</Text>
        </View>
        <PrimaryButton
          label="Continue to checkout"
          subLabel="Pay any way you like"
          variant="amber"
          disabled={order.itemCount === 0}
          onPress={checkout}
          style={styles.payBtn}
        />
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.simpleRow}>
      <Text style={styles.simpleLabel}>{label}</Text>
      <Text style={styles.simpleValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.canvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_GUTTER,
    paddingTop: Space.lg,
    paddingBottom: Space.sm,
  },
  back: { fontSize: Type.body, fontWeight: '700', color: Palette.indigo, width: 80 },
  headerTitle: { fontSize: Type.heading, fontWeight: '800', color: Palette.ink },
  headerSpacer: { width: 80 },
  scroll: { padding: SCREEN_GUTTER, paddingTop: Space.md, gap: Space.lg },
  card: { backgroundColor: Palette.card, borderRadius: Radius.lg, padding: Space.xl, ...cardShadow },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    paddingVertical: Space.md,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  lineQty: { fontSize: Type.body, fontWeight: '800', color: Palette.inkSecondary, minWidth: 28 },
  flex: { flex: 1 },
  lineName: { fontSize: Type.body, fontWeight: '600', color: Palette.ink },
  lineNote: { fontSize: Type.caption, color: Palette.inkMuted, marginTop: 1 },
  linePrice: { fontSize: Type.body, fontWeight: '700', color: Palette.ink },
  empty: { color: Palette.inkMuted, paddingVertical: Space.md },
  upsellRow: { gap: Space.md, paddingTop: Space.md },
  upsell: {
    width: 130,
    backgroundColor: Palette.cardMuted,
    borderRadius: Radius.md,
    padding: Space.lg,
    alignItems: 'flex-start',
    gap: 2,
  },
  upsellEmoji: { fontSize: 28, marginBottom: Space.xs },
  upsellName: { fontSize: Type.caption, fontWeight: '700', color: Palette.ink },
  upsellPrice: { fontSize: Type.caption, fontWeight: '700', color: Palette.teal },
  segment: { flexDirection: 'row', gap: Space.md, marginTop: Space.md },
  segBtn: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Palette.border,
    backgroundColor: Palette.cardMuted,
    padding: Space.lg,
    gap: 2,
  },
  segBtnActive: { borderColor: Palette.indigo, backgroundColor: Palette.indigoSoft },
  segText: { fontSize: Type.body, fontWeight: '700', color: Palette.inkSecondary },
  segTextActive: { color: Palette.indigoInk },
  segSub: { fontSize: Type.caption, color: Palette.inkMuted },
  tipRow: { flexDirection: 'row', gap: Space.sm, marginTop: Space.md },
  tipChip: {
    flex: 1,
    paddingVertical: Space.md,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Palette.border,
    alignItems: 'center',
  },
  tipChipActive: { borderColor: Palette.green, backgroundColor: Palette.greenSoft },
  tipText: { fontSize: Type.bodySmall, fontWeight: '700', color: Palette.inkSecondary },
  tipTextActive: { color: Palette.greenStrong },
  simpleRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Space.xs },
  simpleLabel: { fontSize: Type.body, color: Palette.inkSecondary },
  simpleValue: { fontSize: Type.body, color: Palette.ink, fontWeight: '600' },
  gst: { fontSize: Type.caption, color: Palette.inkMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: Palette.border, marginVertical: Space.md },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  totalLabel: { fontSize: Type.title, fontWeight: '700', color: Palette.ink },
  totalValue: { fontSize: Type.amount, fontWeight: '800', color: Palette.ink, letterSpacing: -0.5 },
  liteChip: { marginTop: Space.md },
  payBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.card,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
    paddingHorizontal: SCREEN_GUTTER,
    paddingVertical: Space.lg,
    gap: Space.lg,
  },
  payTotalLabel: { fontSize: Type.caption, color: Palette.inkMuted },
  payTotal: { fontSize: Type.title, fontWeight: '800', color: Palette.ink },
  payBtn: { flex: 1, maxWidth: 320 },
});
