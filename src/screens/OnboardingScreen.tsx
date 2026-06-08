import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Button, NativeModules, StyleSheet, Text, TextInput, View } from 'react-native';

import { useMerchantSetup } from '@/context/merchant-setup';
import { TABLET_H_PADDING, useResponsive } from '@/hooks/use-responsive';

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

export default function OnboardingScreen() {
  const router = useRouter();
  const { isTablet } = useResponsive();
  const { completeSetup } = useMerchantSetup();

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
      // Flip the in-memory gate so the tabs stop redirecting back here, then
      // replace (not push) so onboarding is gone from the history stack.
      completeSetup();
      router.replace('/(tabs)');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save merchant details. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, isTablet && styles.containerTablet]}>
      <Text style={styles.title}>Merchant Onboarding</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <TextInput
        style={styles.input}
        placeholder="Merchant name"
        value={merchantName}
        onChangeText={setMerchantName}
      />
      <TextInput
        style={styles.input}
        placeholder="Business name"
        value={businessName}
        onChangeText={setBusinessName}
      />
      <TextInput
        style={styles.input}
        placeholder="Category"
        value={category}
        onChangeText={setCategory}
      />
      <TextInput
        style={styles.input}
        placeholder="UPI ID"
        value={upiId}
        onChangeText={setUpiId}
        autoCapitalize="none"
      />
      <Button
        title={submitting ? 'Saving…' : 'Complete setup'}
        onPress={handleSubmit}
        disabled={submitting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  containerTablet: {
    paddingHorizontal: TABLET_H_PADDING,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  error: {
    color: 'red',
  },
});
