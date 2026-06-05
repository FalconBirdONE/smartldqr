import { Redirect } from 'expo-router';

import { ScreenPlaceholder } from '@/components/screen-placeholder';
import { useMerchantSetup } from '@/context/merchant-setup';

export default function OnboardingScreen() {
  const { isSetupComplete } = useMerchantSetup();

  // Onboarding runs once. If setup is already complete, skip it on return visits.
  if (isSetupComplete) {
    return <Redirect href="/(tabs)" />;
  }

  return <ScreenPlaceholder label="OnboardingScreen" />;
}
