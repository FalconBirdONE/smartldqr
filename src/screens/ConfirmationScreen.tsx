import { useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Eyebrow } from '@/components/ldqr/eyebrow';
import { PrimaryButton } from '@/components/ldqr/primary-button';
import { TrustChip } from '@/components/ldqr/trust-chip';
import { cardShadow, Palette, Radius, Space, Type } from '@/constants/design';
import { useCountdown } from '@/hooks/use-countdown';

const AUTO_CLOSE_SECONDS = 25;

/** A 12-digit UTR-shaped reference derived from the transaction id. */
function utrFrom(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return String(h).padStart(12, '0').slice(0, 12);
}

export default function ConfirmationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    transaction_id?: string;
    total_amount?: string;
    timestamp?: string;
    method?: string;
    app?: string;
    bank?: string;
    points?: string;
    emi_months?: string;
    emi_per_month?: string;
  }>();

  const transactionId = params.transaction_id ?? '';
  const totalAmount = Number(params.total_amount ?? 0);
  const timestamp = params.timestamp ? new Date(params.timestamp) : null;
  const method = params.method ?? 'UPI';
  const app = params.app ?? 'UPI app';
  const bank = params.bank ?? '';
  const points = Number(params.points ?? 0);
  const emiMonths = params.emi_months ? Number(params.emi_months) : 0;
  const emiPerMonth = params.emi_per_month ? Number(params.emi_per_month) : 0;

  const utr = useMemo(() => utrFrom(transactionId || 'ldqr'), [transactionId]);
  const [nps, setNps] = useState<number | null>(null);

  const goHome = () => router.replace('/');
  const remaining = useCountdown(AUTO_CLOSE_SECONDS, goHome);

  if (!transactionId) {
    return (
      <View style={styles.screen}>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No transaction yet.</Text>
          <PrimaryButton label="Back to home" variant="dark" onPress={goHome} />
        </View>
      </View>
    );
  }

  const when = timestamp
    ? timestamp.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.check}>
            <Text style={styles.checkMark}>✓</Text>
          </View>

          <Text style={styles.paidLabel}>Paid</Text>
          <Text style={styles.amount}>₹{totalAmount.toLocaleString('en-IN')}</Text>
          <Text style={styles.via}>
            {method} · {app}
            {bank ? ` · ${bank}` : ''}
          </Text>

          {emiMonths ? (
            <View style={styles.emiNote}>
              <Text style={styles.emiNoteText}>
                On EMI · {emiMonths} months × ₹{emiPerMonth.toLocaleString('en-IN')}/mo
              </Text>
            </View>
          ) : null}

          <View style={styles.detailBox}>
            <Detail label="UTR" value={utr} />
            <Detail label="Reference" value={transactionId.slice(0, 18)} />
            {when ? <Detail label="Time" value={when} /> : null}
          </View>

          <View style={styles.statusRow}>
            <TrustChip label="Receipt sent" tone="green" icon="✓" />
            {points > 0 ? <TrustChip label={`+${points} points`} tone="teal" icon="♥" /> : null}
            <TrustChip label="Secure" tone="neutral" icon="🔒" />
          </View>
        </View>

        {/* Optional, never-blocking NPS. */}
        <View style={styles.npsCard}>
          <Eyebrow>Totally optional</Eyebrow>
          <Text style={styles.npsTitle}>
            {nps === null ? 'How was paying here?' : 'Thanks for the feedback!'}
          </Text>
          {nps === null ? (
            <View style={styles.npsRow}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <Pressable key={n} style={styles.npsDot} onPress={() => setNps(n)}>
                  <Text style={styles.npsDotText}>{n}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          <PrimaryButton label="New order" variant="dark" onPress={goHome} />
          <Text style={styles.closing}>Closing in {remaining}s</Text>
        </View>
      </ScrollView>
    </View>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Space.xl,
    gap: Space.lg,
  },
  card: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: Palette.card,
    borderRadius: Radius.xl,
    padding: Space.xxl,
    alignItems: 'center',
    ...cardShadow,
  },
  check: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Palette.greenSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Space.lg,
  },
  checkMark: {
    fontSize: 52,
    color: Palette.green,
    fontWeight: '800',
    lineHeight: 58,
  },
  paidLabel: {
    fontSize: Type.body,
    color: Palette.green,
    fontWeight: '700',
  },
  amount: {
    fontSize: Type.amount,
    fontWeight: '800',
    color: Palette.ink,
    letterSpacing: -0.5,
  },
  via: {
    fontSize: Type.bodySmall,
    color: Palette.inkSecondary,
    marginTop: Space.xs,
  },
  emiNote: {
    marginTop: Space.md,
    backgroundColor: Palette.indigoSoft,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
  },
  emiNoteText: {
    color: Palette.indigoInk,
    fontWeight: '600',
    fontSize: Type.caption,
  },
  detailBox: {
    width: '100%',
    marginTop: Space.xl,
    gap: Space.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: Type.bodySmall,
    color: Palette.inkMuted,
  },
  detailValue: {
    fontSize: Type.bodySmall,
    color: Palette.ink,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Space.sm,
    marginTop: Space.xl,
  },
  npsCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    padding: Space.xl,
    ...cardShadow,
  },
  npsTitle: {
    fontSize: Type.heading,
    fontWeight: '700',
    color: Palette.ink,
    marginTop: 2,
    marginBottom: Space.md,
  },
  npsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.sm,
  },
  npsDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  npsDotText: {
    fontSize: Type.bodySmall,
    fontWeight: '700',
    color: Palette.inkSecondary,
  },
  actions: {
    alignItems: 'center',
    gap: Space.sm,
  },
  closing: {
    fontSize: Type.caption,
    color: Palette.inkMuted,
  },
  emptyCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.lg,
  },
  emptyText: {
    fontSize: Type.body,
    color: Palette.inkSecondary,
  },
});
