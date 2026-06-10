import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Eyebrow } from '@/components/ldqr/eyebrow';
import { PrimaryButton } from '@/components/ldqr/primary-button';
import { TrustChip } from '@/components/ldqr/trust-chip';
import { cardShadow, Palette, Radius, SCREEN_GUTTER, Space, Type } from '@/constants/design';
import type { CheckoutLine } from '@/types/checkout';

/**
 * Unified checkout STUB. Receives the basket from any module (retail
 * CaptureCheckout or the QSR order) and shows the full, ungated payment
 * method set. The real payment matrix lands here in the next phase — until
 * then nothing is charged or logged from this screen.
 */
const PAYMENT_METHODS: { icon: string; label: string }[] = [
  { icon: '▢', label: 'UPI QR' },
  { icon: '📲', label: 'Tap & Pay' },
  { icon: '⚡', label: 'UPI Lite' },
  { icon: '🖐️', label: 'Pay@Palm' },
  { icon: '%', label: 'Credit Line / EMI' },
  { icon: '♥', label: 'Loyalty + Pay' },
];

export default function CheckoutStub() {
  const router = useRouter();
  const params = useLocalSearchParams<{ source?: string; total?: string; basket?: string }>();

  const lines = useMemo<CheckoutLine[]>(() => {
    try {
      return params.basket ? (JSON.parse(params.basket) as CheckoutLine[]) : [];
    } catch {
      return [];
    }
  }, [params.basket]);

  const total = Number(params.total) || lines.reduce((s, l) => s + l.subtotal, 0);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll}>
      <View style={styles.header}>
        <Eyebrow>{params.source === 'qsr' ? 'U4 · QSR order' : 'Checkout'}</Eyebrow>
        <Text style={styles.title}>Pay ₹{total.toLocaleString('en-IN')}</Text>
        <Text style={styles.subtitle}>Every payment method is available for this bill.</Text>
      </View>

      <View style={styles.card}>
        <Eyebrow color={Palette.teal}>Itemised bill</Eyebrow>
        {lines.map((l) => (
          <View key={l.id} style={styles.line}>
            <Text style={styles.lineQty}>{l.quantity}×</Text>
            <View style={styles.lineInfo}>
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

      <View style={styles.card}>
        <Eyebrow color={Palette.indigo}>Payment methods · no restrictions</Eyebrow>
        <View style={styles.methodGrid}>
          {PAYMENT_METHODS.map((m) => (
            <View key={m.label} style={styles.method}>
              <Text style={styles.methodIcon}>{m.icon}</Text>
              <Text style={styles.methodLabel}>{m.label}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.stubNote}>
          Payment matrix coming next — selecting a method does nothing yet.
        </Text>
        <View style={styles.chips}>
          <TrustChip label="Secure · UPI" tone="green" icon="🔒" />
        </View>
      </View>

      <PrimaryButton
        label="Back"
        variant="ghost"
        size="md"
        onPress={() => router.back()}
        style={styles.backBtn}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.canvas },
  scroll: { padding: SCREEN_GUTTER, gap: Space.lg },
  header: { gap: 2, paddingRight: 60 },
  title: { fontSize: Type.display, fontWeight: '800', color: Palette.ink, letterSpacing: -0.5 },
  subtitle: { fontSize: Type.bodySmall, color: Palette.inkSecondary },
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
  lineInfo: { flex: 1 },
  lineName: { fontSize: Type.body, fontWeight: '600', color: Palette.ink },
  lineNote: { fontSize: Type.caption, color: Palette.inkMuted, marginTop: 1 },
  linePrice: { fontSize: Type.body, fontWeight: '700', color: Palette.ink },
  empty: { color: Palette.inkMuted, paddingVertical: Space.md },
  divider: { height: 1, backgroundColor: Palette.border, marginVertical: Space.md },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  totalLabel: { fontSize: Type.heading, fontWeight: '700', color: Palette.ink },
  totalValue: { fontSize: Type.amount, fontWeight: '800', color: Palette.ink, letterSpacing: -0.5 },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.md,
    marginTop: Space.md,
  },
  method: {
    flexGrow: 1,
    flexBasis: 140,
    alignItems: 'center',
    gap: Space.xs,
    backgroundColor: Palette.cardMuted,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
    paddingVertical: Space.lg,
  },
  methodIcon: { fontSize: Type.title },
  methodLabel: { fontSize: Type.caption, fontWeight: '700', color: Palette.inkSecondary },
  stubNote: { fontSize: Type.caption, color: Palette.inkMuted, marginTop: Space.md },
  chips: { flexDirection: 'row', marginTop: Space.md },
  backBtn: { alignSelf: 'flex-start' },
});
