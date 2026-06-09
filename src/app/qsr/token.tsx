import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandCanvas } from '@/components/ldqr/brand-canvas';
import { Eyebrow } from '@/components/ldqr/eyebrow';
import { TrustChip } from '@/components/ldqr/trust-chip';
import { Palette, Radius, Space, Type } from '@/constants/design';
import { useBrand } from '@/context/brand';
import { useCountdown } from '@/hooks/use-countdown';

const STAGES = ['Received', 'Preparing', 'Ready'] as const;

export default function QsrToken() {
  const router = useRouter();
  const { brand } = useBrand();
  const params = useLocalSearchParams<{ token?: string; total?: string; method?: string; dine?: string }>();

  const token = params.token ?? 'A-00';
  const total = Number(params.total ?? 0);
  const method = params.method ?? 'UPI Lite';
  const dineIn = params.dine !== 'out';

  // Live kitchen status: Received → Preparing → Ready.
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 3500);
    const t2 = setTimeout(() => setStage(2), 11000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const goHome = () => router.replace('/qsr' as Href);
  const remaining = useCountdown(45, goHome);

  return (
    <BrandCanvas brand={brand}>
      <View style={styles.container}>
        <View style={styles.topRow}>
          <View style={styles.paidPill}>
            <Text style={styles.paidCheck}>✓</Text>
            <Text style={styles.paidText}>Paid ₹{total.toLocaleString('en-IN')} · {method}</Text>
          </View>
          <TrustChip label="Receipt sent" tone="light" icon="✓" />
        </View>

        <View style={styles.center}>
          <Eyebrow color={brand.onBrandMuted}>Your order token</Eyebrow>
          <Text style={[styles.token, { color: brand.onBrand }]}>{token}</Text>
          <Text style={[styles.voice, { color: brand.onBrandMuted }]}>
            Your chai is on the way. {dineIn ? 'We’ll bring it over.' : 'We’ll call your token.'}
          </Text>
        </View>

        {/* Live kitchen status tracker */}
        <View style={styles.tracker}>
          {STAGES.map((label, i) => {
            const done = i < stage;
            const active = i === stage;
            return (
              <View key={label} style={styles.stage}>
                <View
                  style={[
                    styles.dot,
                    done && styles.dotDone,
                    active && styles.dotActive,
                  ]}
                >
                  <Text style={styles.dotText}>{done ? '✓' : i + 1}</Text>
                </View>
                <Text style={[styles.stageLabel, (done || active) && styles.stageLabelOn]}>{label}</Text>
                {i < STAGES.length - 1 ? (
                  <View style={[styles.connector, done && styles.connectorDone]} />
                ) : null}
              </View>
            );
          })}
        </View>

        <View style={styles.footer}>
          <Pressable style={styles.newOrder} onPress={goHome}>
            <Text style={styles.newOrderText}>Start a new order</Text>
          </Pressable>
          <Text style={[styles.closing, { color: brand.onBrandMuted }]}>
            This screen closes in {remaining}s
          </Text>
        </View>
      </View>
    </BrandCanvas>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Space.xxl, justifyContent: 'space-between' },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  paidPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    backgroundColor: Palette.green,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
  },
  paidCheck: { color: Palette.onColor, fontWeight: '800' },
  paidText: { color: Palette.onColor, fontWeight: '700', fontSize: Type.bodySmall },
  center: { alignItems: 'center', gap: Space.sm },
  token: {
    fontSize: Type.token,
    fontWeight: '900',
    letterSpacing: -4,
    lineHeight: Type.token,
  },
  voice: { fontSize: Type.heading, textAlign: 'center', maxWidth: 480 },
  tracker: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 0,
  },
  stage: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  dot: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  dotDone: { backgroundColor: Palette.green, borderColor: Palette.green },
  dotActive: { backgroundColor: Palette.amber, borderColor: Palette.amber },
  dotText: { color: Palette.onColor, fontWeight: '800' },
  stageLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '700',
    fontSize: Type.bodySmall,
    marginLeft: Space.sm,
  },
  stageLabelOn: { color: Palette.onColor },
  connector: {
    width: 56,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginHorizontal: Space.md,
  },
  connectorDone: { backgroundColor: Palette.green },
  footer: { alignItems: 'center', gap: Space.sm },
  newOrder: {
    paddingVertical: Space.lg,
    paddingHorizontal: Space.xxl,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  newOrderText: { color: Palette.onColor, fontWeight: '700', fontSize: Type.body },
  closing: { fontSize: Type.caption },
});
