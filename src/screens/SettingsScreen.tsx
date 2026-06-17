import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Eyebrow } from '@/components/ldqr/eyebrow';
import { TrustChip } from '@/components/ldqr/trust-chip';
import { cardShadow, Palette, Radius, SCREEN_GUTTER, Space, Type } from '@/constants/design';
import { useBrand } from '@/context/brand';
import { useMerchantSetup } from '@/context/merchant-setup';

const COMPLIANCE: { icon: string; title: string; sub: string }[] = [
  { icon: '🎥', title: 'Camera private', sub: 'No face capture on idle — surfaced as a chip.' },
  { icon: '⚡', title: 'UPI Lite', sub: 'No PIN for orders under ₹500.' },
  { icon: '🖐️', title: 'Biometrics', sub: 'Palm template stays on-device; UPI-PIN fallback always offered.' },
  { icon: '♥', title: 'Loyalty consent', sub: 'Explicit opt-in · DPDP Act compliant.' },
  { icon: '%', title: 'Credit Line on UPI', sub: 'EMI shown with RBI Key Fact Statement before confirm.' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { brand, options, setBrandId } = useBrand();
  const { resetSetup } = useMerchantSetup();

  const handleReset = () => {
    resetSetup();
    router.replace('/onboarding');
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} hitSlop={12} style={styles.backBtn}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <Eyebrow>Device</Eyebrow>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.card}>
        <View style={[styles.brandDot, { backgroundColor: brand.brand }]} />
        <View style={styles.brandInfo}>
          <Text style={styles.brandName}>{brand.name}</Text>
          <Text style={styles.brandMeta}>{brand.tagline}</Text>
          <Text style={styles.brandMeta}>{brand.vpa}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Eyebrow color={Palette.indigo}>Brand canvas</Eyebrow>
        <Text style={styles.cardTitle}>Theme this device</Text>
        <Text style={styles.cardSub}>The same system, re-skinned per merchant.</Text>
        <View style={styles.swatchRow}>
          {options.map((b) => (
            <Pressable
              key={b.id}
              onPress={() => setBrandId(b.id)}
              style={[styles.swatch, brand.id === b.id && styles.swatchActive]}
            >
              <View style={[styles.swatchFill, { backgroundColor: b.brand }]}>
                {brand.id === b.id ? <Text style={styles.swatchCheck}>✓</Text> : null}
              </View>
              <Text style={styles.swatchLabel}>{b.name}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <Eyebrow color={Palette.green}>Trust & compliance</Eyebrow>
        <Text style={styles.cardTitle}>Always surfaced, never hidden</Text>
        <View style={styles.complianceList}>
          {COMPLIANCE.map((c) => (
            <View key={c.title} style={styles.complianceRow}>
              <Text style={styles.complianceIcon}>{c.icon}</Text>
              <View style={styles.flex}>
                <Text style={styles.complianceTitle}>{c.title}</Text>
                <Text style={styles.complianceSub}>{c.sub}</Text>
              </View>
            </View>
          ))}
        </View>
        <View style={styles.chips}>
          <TrustChip label="DPDP Act compliant" tone="green" icon="✓" />
          <TrustChip label="RBI KFS" tone="teal" icon="✓" />
        </View>
      </View>

      <Pressable style={styles.resetBtn} onPress={handleReset}>
        <Text style={styles.resetText}>Reset device setup</Text>
        <Text style={styles.resetSub}>Clears onboarding and returns to setup.</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.canvas },
  scroll: { padding: SCREEN_GUTTER, gap: Space.lg },
  header: { gap: 2 },
  backBtn: { alignSelf: 'flex-start', marginBottom: Space.sm },
  backText: { fontSize: Type.body, fontWeight: '700', color: Palette.indigo },
  title: { fontSize: Type.title, fontWeight: '800', color: Palette.ink },
  card: {
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    padding: Space.xl,
    ...cardShadow,
  },
  brandDot: {
    width: 48,
    height: 48,
    borderRadius: Radius.sm,
    marginBottom: Space.md,
  },
  brandInfo: { gap: 2 },
  brandName: { fontSize: Type.heading, fontWeight: '700', color: Palette.ink },
  brandMeta: { fontSize: Type.caption, color: Palette.inkSecondary },
  cardTitle: { fontSize: Type.heading, fontWeight: '700', color: Palette.ink, marginTop: 2 },
  cardSub: { fontSize: Type.caption, color: Palette.inkSecondary, marginBottom: Space.md },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.lg, marginTop: Space.sm },
  swatch: { alignItems: 'center', gap: Space.xs, padding: 4, borderRadius: Radius.sm, borderWidth: 2, borderColor: 'transparent' },
  swatchActive: { borderColor: Palette.ink },
  swatchFill: {
    width: 56,
    height: 56,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchCheck: { color: '#FFFFFF', fontWeight: '800', fontSize: Type.heading },
  swatchLabel: { fontSize: Type.micro, color: Palette.inkSecondary, fontWeight: '600' },
  complianceList: { marginTop: Space.md, gap: Space.lg },
  complianceRow: { flexDirection: 'row', gap: Space.md, alignItems: 'flex-start' },
  complianceIcon: { fontSize: Type.heading, width: 28, textAlign: 'center' },
  flex: { flex: 1 },
  complianceTitle: { fontSize: Type.body, fontWeight: '700', color: Palette.ink },
  complianceSub: { fontSize: Type.caption, color: Palette.inkSecondary, marginTop: 1 },
  chips: { flexDirection: 'row', gap: Space.sm, marginTop: Space.lg },
  resetBtn: {
    backgroundColor: Palette.dangerSoft,
    borderRadius: Radius.lg,
    padding: Space.xl,
  },
  resetText: { fontSize: Type.body, fontWeight: '700', color: Palette.danger },
  resetSub: { fontSize: Type.caption, color: Palette.danger, opacity: 0.8, marginTop: 2 },
});
