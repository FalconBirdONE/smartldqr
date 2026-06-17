import { Redirect, Stack } from 'expo-router';

import { useMerchantSetup } from '@/context/merchant-setup';

export default function TabsLayout() {
  const { isSetupComplete, isHydrated } = useMerchantSetup();

  // Wait for the persisted flag before routing to avoid a flash of onboarding.
  if (!isHydrated) {
    return null;
  }

  // Gate: these screens are only reachable once merchant setup is complete.
  // Otherwise send the merchant to onboarding.
  if (!isSetupComplete) {
    return <Redirect href="/onboarding" />;
  }

  // No bottom navigation: screens navigate programmatically (mode cards on
  // Home, the floating Settings button, in-flow CTAs).
  return <Stack screenOptions={{ headerShown: false }} />;
}
