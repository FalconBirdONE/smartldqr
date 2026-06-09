import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BrandCanvas } from '@/components/ldqr/brand-canvas';
import { Eyebrow } from '@/components/ldqr/eyebrow';
import { TrustChip } from '@/components/ldqr/trust-chip';
import { Palette, Radius, Space, Type } from '@/constants/design';
import { useBrand } from '@/context/brand';
import { BasketStore } from '@/services/basket-store';

type Mode = {
  code: string;
  title: string;
  sub: string;
  icon: string;
  href: Href;
};

const MODES: Mode[] = [
  {
    code: 'U2 · SELF-CHECKOUT',
    title: 'Scan & pay',
    sub: 'Add items, then tap or scan to pay',
    icon: '🛒',
    href: '/catalog',
  },
  {
    code: 'U4 · QSR SELF-ORDER',
    title: 'Order food',
    sub: 'Browse the menu · UPI Lite ready',
    icon: '🍜',
    // Cast: the /qsr routes are real but the typed-routes manifest only picks
    // them up once Expo regenerates it (next `expo start`/build).
    href: '/qsr' as Href,
  },
  {
    code: 'U1 · CASHIER-LED',
    title: 'Pay your bill',
    sub: 'Cashier sends the bill here',
    icon: '🧾',
    href: '/checkout',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { brand } = useBrand();
  const [basketCount, setBasketCount] = useState(0);
  const [basketTotal, setBasketTotal] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const [items, total] = await Promise.all([
        BasketStore.getBasketItems(),
        BasketStore.getBasketTotal(),
      ]);
      setBasketCount(items.reduce((n, it) => n + it.quantity, 0));
      setBasketTotal(total);
    } catch {
      // Idle screen tolerates a missing basket silently.
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  return (
    <BrandCanvas brand={brand}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <View>
            <Eyebrow color={brand.onBrandMuted}>{brand.tagline}</Eyebrow>
            <Text style={[styles.wordmark, { color: brand.onBrand }]}>{brand.name}</Text>
          </View>
          <TrustChip label="Camera private" tone="light" icon="🎥" />
        </View>

        <View style={styles.hero}>
          <Text style={[styles.greeting, { color: brand.onBrand }]}>{brand.greeting}</Text>
          <Text style={[styles.tapHint, { color: brand.onBrandMuted }]}>
            Tap a mode to begin — no account needed.
          </Text>
        </View>

        {/* Retail-media / daily offer surface. */}
        <View style={styles.offerCard}>
          <Eyebrow color={Palette.amberInk}>Today · Retail media</Eyebrow>
          <Text style={styles.offerTitle}>No-cost EMI on baskets over ₹3,000</Text>
          <Text style={styles.offerSub}>Split into 3 months via Credit Line on UPI.</Text>
        </View>

        {basketCount > 0 ? (
          <Pressable style={styles.resume} onPress={() => router.push('/checkout')}>
            <View>
              <Text style={styles.resumeTitle}>Resume your basket</Text>
              <Text style={styles.resumeSub}>
                {basketCount} item{basketCount === 1 ? '' : 's'} · ₹
                {basketTotal.toLocaleString('en-IN')}
              </Text>
            </View>
            <Text style={styles.resumeArrow}>Continue ›</Text>
          </Pressable>
        ) : null}

        <View style={styles.modes}>
          {MODES.map((m) => (
            <Pressable key={m.code} style={styles.modeCard} onPress={() => router.push(m.href)}>
              <Text style={styles.modeIcon}>{m.icon}</Text>
              <Eyebrow color={Palette.inkMuted}>{m.code}</Eyebrow>
              <Text style={styles.modeTitle}>{m.title}</Text>
              <Text style={styles.modeSub}>{m.sub}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.footerNote}>
          <TrustChip label="UPI · UPI Lite · Credit Line on UPI" tone="light" icon="✓" />
        </View>
      </ScrollView>
    </BrandCanvas>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Space.xxl,
    gap: Space.xl,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  wordmark: {
    fontSize: Type.display,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  hero: {
    marginTop: Space.sm,
  },
  greeting: {
    fontSize: Type.amount,
    fontWeight: '800',
    letterSpacing: -1,
  },
  tapHint: {
    fontSize: Type.body,
    marginTop: Space.sm,
  },
  offerCard: {
    backgroundColor: Palette.amberSoft,
    borderRadius: Radius.lg,
    padding: Space.xl,
  },
  offerTitle: {
    fontSize: Type.heading,
    fontWeight: '700',
    color: Palette.amberInk,
    marginTop: 2,
  },
  offerSub: {
    fontSize: Type.bodySmall,
    color: Palette.amberInk,
    opacity: 0.85,
    marginTop: 2,
  },
  resume: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: Radius.md,
    padding: Space.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  resumeTitle: {
    color: Palette.onColor,
    fontSize: Type.body,
    fontWeight: '700',
  },
  resumeSub: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: Type.caption,
    marginTop: 2,
  },
  resumeArrow: {
    color: Palette.onColor,
    fontSize: Type.body,
    fontWeight: '700',
  },
  modes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.lg,
  },
  modeCard: {
    flexGrow: 1,
    flexBasis: 200,
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    padding: Space.xl,
    gap: 2,
  },
  modeIcon: {
    fontSize: 34,
    marginBottom: Space.sm,
  },
  modeTitle: {
    fontSize: Type.title,
    fontWeight: '700',
    color: Palette.ink,
    marginTop: 2,
  },
  modeSub: {
    fontSize: Type.caption,
    color: Palette.inkSecondary,
    marginTop: 2,
  },
  footerNote: {
    alignItems: 'center',
    marginTop: Space.sm,
  },
});
