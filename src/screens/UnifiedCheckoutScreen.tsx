import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Eyebrow } from '@/components/ldqr/eyebrow';
import { PaymentMatrix } from '@/components/ldqr/payment-matrix';
import { PrimaryButton } from '@/components/ldqr/primary-button';
import { cardShadow, Palette, Radius, SCREEN_GUTTER, Space, Type } from '@/constants/design';
import { useResponsive } from '@/hooks/use-responsive';
import type { CheckoutLine } from '@/types/checkout';

/**
 * The unified checkout — target of CaptureCheckout's "Confirm checkout"
 * (U1/U2, source=retail) and the U4 QSR handoff (source=qsr). Renders the
 * itemised bill alongside the shared `PaymentMatrix` (UPI QR + payment options),
 * which owns every rail and the confirmation handoff.
 *
 * Tablet layout: QR + matrix on the left (highest priority), bill summary on
 * the right. Phone stacks them in a single column.
 */
export default function UnifiedCheckoutScreen() {
  const router = useRouter();
  const { isTablet } = useResponsive();
  const params = useLocalSearchParams<{ source?: string; total?: string; basket?: string }>();

  const source = params.source === 'qsr' ? 'qsr' : 'retail';

  const lines = useMemo<CheckoutLine[]>(() => {
    try {
      return params.basket ? (JSON.parse(params.basket) as CheckoutLine[]) : [];
    } catch {
      return [];
    }
  }, [params.basket]);

  const total = Number(params.total) || lines.reduce((s, l) => s + l.subtotal, 0);
  const itemCount = lines.reduce((n, l) => n + l.quantity, 0);

  const summary = (
    <View style={[styles.card, isTablet && styles.summaryTablet]}>
      <Eyebrow color={Palette.teal}>Itemised bill</Eyebrow>
      {lines.map((l) => (
        <View key={l.id} style={styles.line}>
          <Text style={styles.lineQty}>{l.quantity}×</Text>
          <View style={styles.flex}>
            <Text style={styles.lineName}>{l.name}</Text>
            {l.note ? <Text style={styles.lineNote}>{l.note}</Text> : null}
          </View>
          <Text style={styles.linePrice}>₹{l.subtotal.toLocaleString('en-IN')}</Text>
        </View>
      ))}
      {lines.length === 0 ? <Text style={styles.empty}>No items received.</Text> : null}
      <View style={styles.divider} />
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>₹{total.toLocaleString('en-IN')}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Eyebrow>{source === 'qsr' ? 'U4 · QSR order' : 'Unified checkout'}</Eyebrow>
          <Text style={styles.title}>Pay ₹{total.toLocaleString('en-IN')}</Text>
          <Text style={styles.subtitle}>
            {itemCount} item{itemCount === 1 ? '' : 's'} · pick any method — nothing is gated.
          </Text>
        </View>

        {isTablet ? (
          <View style={styles.bodyTablet}>
            <PaymentMatrix lines={lines} total={total} source={source} style={styles.matrixTablet} />
            {summary}
          </View>
        ) : (
          // Phone: show the bill first, then the payment surface.
          <>
            {summary}
            <PaymentMatrix lines={lines} total={total} source={source} />
          </>
        )}

        <PrimaryButton
          label="Back"
          variant="ghost"
          size="md"
          onPress={() => router.back()}
          style={styles.backBtn}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.canvas },
  scroll: { padding: SCREEN_GUTTER, gap: Space.lg },
  header: { gap: 2, paddingRight: 60 },
  title: { fontSize: Type.display, fontWeight: '800', color: Palette.ink, letterSpacing: -0.5 },
  subtitle: { fontSize: Type.bodySmall, color: Palette.inkSecondary },

  bodyTablet: { flexDirection: 'row', gap: Space.lg, alignItems: 'flex-start' },
  matrixTablet: { flex: 1.4 },
  summaryTablet: { flex: 1 },

  card: { backgroundColor: Palette.card, borderRadius: Radius.lg, padding: Space.xl, ...cardShadow },
  flex: { flex: 1 },

  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    paddingVertical: Space.md,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  lineQty: { fontSize: Type.body, fontWeight: '800', color: Palette.inkSecondary, minWidth: 28 },
  lineName: { fontSize: Type.body, fontWeight: '600', color: Palette.ink },
  lineNote: { fontSize: Type.caption, color: Palette.inkMuted, marginTop: 1 },
  linePrice: { fontSize: Type.body, fontWeight: '700', color: Palette.ink },
  empty: { color: Palette.inkMuted, fontSize: Type.body, marginTop: Space.lg },
  divider: { height: 1, backgroundColor: Palette.border, marginVertical: Space.md },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  totalLabel: { fontSize: Type.heading, fontWeight: '700', color: Palette.ink },
  totalValue: { fontSize: Type.amount, fontWeight: '800', color: Palette.ink, letterSpacing: -0.5 },

  backBtn: { alignSelf: 'flex-start' },
});
