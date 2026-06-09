import { useState } from 'react';
import { useRouter } from 'expo-router';
import { NativeModules, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { BrandCanvas } from '@/components/ldqr/brand-canvas';
import { Eyebrow } from '@/components/ldqr/eyebrow';
import { PrimaryButton } from '@/components/ldqr/primary-button';
import { TrustChip } from '@/components/ldqr/trust-chip';
import { cardShadow, Palette, Radius, Space, Type } from '@/constants/design';
import { useBrand } from '@/context/brand';
import { useMerchantSetup } from '@/context/merchant-setup';
import { useResponsive } from '@/hooks/use-responsive';

type MerchantDetails = {
  merchant_name: string;
  business_name: string;
  category: string;
  upi_id: string;
};

const { MerchantModule } = NativeModules as {
  MerchantModule?: {
    saveMerchantDetails(details: MerchantDetails): Promise<boolean>;
    getMerchantDetails(): Promise<string>;
    isOnboardingComplete(): Promise<boolean>;
    clearMerchantDetails(): Promise<boolean>;
  };
};

function Field({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor={Palette.inkMuted} {...props} />
    </View>
  );
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { isTablet } = useResponsive();
  const { completeSetup } = useMerchantSetup();
  const { brand, options, setBrandId } = useBrand();

  const [merchantName, setMerchantName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [category, setCategory] = useState('');
  const [upiId, setUpiId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!merchantName.trim() || !businessName.trim() || !category.trim() || !upiId.trim()) {
      setError('All fields are required.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await MerchantModule?.saveMerchantDetails({
        merchant_name: merchantName.trim(),
        business_name: businessName.trim(),
        category: category.trim(),
        upi_id: upiId.trim(),
      });
      completeSetup();
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save merchant details. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const brandPanel = (
    <View style={[styles.brandPanel, isTablet && styles.brandPanelTablet]}>
      <BrandCanvas brand={brand} style={styles.brandCanvas}>
        <View style={styles.brandInner}>
          <Eyebrow color={brand.onBrandMuted}>{brand.tagline}</Eyebrow>
          <Text style={[styles.brandName, { color: brand.onBrand }]}>{brand.name}</Text>
          <Text style={[styles.brandGreeting, { color: brand.onBrandMuted }]}>{brand.greeting}</Text>
          <View style={styles.brandChip}>
            <TrustChip label="Camera private" tone="light" icon="🎥" />
          </View>
        </View>
      </BrandCanvas>
    </View>
  );

  const formPanel = (
    <View style={[styles.card, isTablet && styles.formPanelTablet]}>
      <Eyebrow color={Palette.indigo}>Device setup</Eyebrow>
      <Text style={styles.title}>Set up your counter</Text>
      <Text style={styles.subtitle}>Runs once · unlocks the payment device.</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Field label="Merchant name" placeholder="Owner / operator" value={merchantName} onChangeText={setMerchantName} />
      <Field label="Business name" placeholder="Shown to customers" value={businessName} onChangeText={setBusinessName} />
      <Field label="Category" placeholder="e.g. Retail, QSR" value={category} onChangeText={setCategory} />
      <Field label="UPI ID" placeholder="name.bgr1@bank" value={upiId} onChangeText={setUpiId} autoCapitalize="none" />

      <Text style={styles.brandLabel}>Brand canvas</Text>
      <View style={styles.brandRow}>
        {options.map((b) => (
          <Pressable
            key={b.id}
            onPress={() => setBrandId(b.id)}
            style={[styles.swatch, { backgroundColor: b.brand }, brand.id === b.id && styles.swatchActive]}
          >
            {brand.id === b.id ? <Text style={styles.swatchCheck}>✓</Text> : null}
          </Pressable>
        ))}
      </View>

      <PrimaryButton
        label={submitting ? 'Saving…' : 'Complete setup'}
        variant="indigo"
        loading={submitting}
        onPress={() => void handleSubmit()}
        style={styles.submit}
      />
    </View>
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scroll}>
      {isTablet ? (
        <View style={styles.bodyTablet}>
          {brandPanel}
          {formPanel}
        </View>
      ) : (
        <>
          {brandPanel}
          {formPanel}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.canvas },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Space.xl,
    gap: Space.xl,
  },
  bodyTablet: {
    flexDirection: 'row',
    gap: Space.xl,
    alignItems: 'stretch',
  },
  brandPanel: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    minHeight: 220,
  },
  brandPanelTablet: { flex: 1 },
  brandCanvas: { borderRadius: Radius.xl },
  brandInner: {
    flex: 1,
    padding: Space.xxl,
    justifyContent: 'center',
    gap: Space.sm,
  },
  brandName: {
    fontSize: Type.display,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  brandGreeting: {
    fontSize: Type.body,
  },
  brandChip: {
    marginTop: Space.lg,
  },
  card: {
    backgroundColor: Palette.card,
    borderRadius: Radius.xl,
    padding: Space.xxl,
    gap: Space.md,
    ...cardShadow,
  },
  formPanelTablet: { flex: 1, maxWidth: 480 },
  title: { fontSize: Type.title, fontWeight: '800', color: Palette.ink, marginTop: 2 },
  subtitle: { fontSize: Type.bodySmall, color: Palette.inkSecondary, marginBottom: Space.sm },
  field: { gap: 4 },
  fieldLabel: { fontSize: Type.caption, color: Palette.inkSecondary, fontWeight: '600' },
  input: {
    borderWidth: 1.5,
    borderColor: Palette.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Space.md,
    paddingVertical: Space.md,
    fontSize: Type.body,
    color: Palette.ink,
    backgroundColor: Palette.cardMuted,
  },
  brandLabel: {
    fontSize: Type.caption,
    color: Palette.inkSecondary,
    fontWeight: '600',
    marginTop: Space.sm,
  },
  brandRow: {
    flexDirection: 'row',
    gap: Space.md,
  },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  swatchActive: {
    borderColor: Palette.ink,
  },
  swatchCheck: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  submit: { marginTop: Space.md },
  error: {
    color: Palette.danger,
    backgroundColor: Palette.dangerSoft,
    borderRadius: Radius.sm,
    padding: Space.md,
    fontSize: Type.bodySmall,
  },
});
