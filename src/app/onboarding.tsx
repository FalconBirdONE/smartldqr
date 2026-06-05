import { Redirect } from 'expo-router';

import { useMerchantSetup } from '@/context/merchant-setup';
import OnboardingScreen from '@/screens/OnboardingScreen';

export default function OnboardingRoute() {
  const { isSetupComplete, isHydrated } = useMerchantSetup();

  // Wait for the persisted flag before deciding; avoids a flash of the form.
  if (!isHydrated) {
    return null;
  }

  // Onboarding runs once. If setup is already complete, skip it on return visits.
  if (isSetupComplete) {
    return <Redirect href="/(tabs)" />;
  }

  return <OnboardingScreen />;
}
