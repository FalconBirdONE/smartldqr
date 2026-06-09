import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BrandCanvas } from '@/components/ldqr/brand-canvas';
import { Eyebrow } from '@/components/ldqr/eyebrow';
import { PrimaryButton } from '@/components/ldqr/primary-button';
import { TrustChip } from '@/components/ldqr/trust-chip';
import { Palette, Radius, Space, Type } from '@/constants/design';
import { useBrand } from '@/context/brand';

export default function QsrWelcome() {
  const router = useRouter();
  const { brand } = useBrand();

  return (
    <BrandCanvas brand={brand}>
      <View style={styles.container}>
        <View style={styles.topRow}>
          <Pressable onPress={() => router.replace('/')} hitSlop={12}>
            <Text style={[styles.back, { color: brand.onBrandMuted }]}>‹ Home</Text>
          </Pressable>
          <TrustChip label="Camera private" tone="light" icon="🎥" />
        </View>

        <View style={styles.center}>
          <Eyebrow color={brand.onBrandMuted}>{brand.name} · Self-order</Eyebrow>
          <Text style={[styles.greeting, { color: brand.onBrand }]}>Hi! Hungry?</Text>
          <Text style={[styles.sub, { color: brand.onBrandMuted }]}>
            Browse, customise and pay — your food comes to you.
          </Text>

          <View style={styles.offer}>
            <Eyebrow color={Palette.amberInk}>Daily offer</Eyebrow>
            <Text style={styles.offerTitle}>Chai + Samosa combo · ₹90</Text>
            <Text style={styles.offerSub}>Pay with UPI Lite — no PIN under ₹500.</Text>
          </View>

          <PrimaryButton
            label="Tap to start"
            subLabel="Order in under a minute"
            variant="amber"
            onPress={() => router.push('/qsr/menu' as Href)}
            style={styles.cta}
          />
        </View>

        <View style={styles.footer}>
          <TrustChip label="UPI Lite · the fast way to pay for food" tone="light" icon="⚡" />
        </View>
      </View>
    </BrandCanvas>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: Space.xxl,
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: { fontSize: Type.body, fontWeight: '600' },
  center: {
    alignItems: 'flex-start',
    gap: Space.md,
  },
  greeting: {
    fontSize: Type.token * 0.6,
    fontWeight: '800',
    letterSpacing: -2,
  },
  sub: {
    fontSize: Type.heading,
    maxWidth: 520,
  },
  offer: {
    backgroundColor: Palette.amberSoft,
    borderRadius: Radius.lg,
    padding: Space.xl,
    marginTop: Space.lg,
    alignSelf: 'stretch',
    maxWidth: 460,
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
  cta: {
    marginTop: Space.lg,
    alignSelf: 'flex-start',
  },
  footer: {
    alignItems: 'center',
  },
});
