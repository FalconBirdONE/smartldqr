import { Redirect } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useMerchantSetup } from '@/context/merchant-setup';

export default function TabsLayout() {
  const { isSetupComplete, isHydrated } = useMerchantSetup();

  // Wait for the persisted flag before routing to avoid a flash of onboarding.
  if (!isHydrated) {
    return null;
  }

  // Gate: the tabs are only reachable once merchant setup is complete.
  // Otherwise send the merchant to onboarding.
  if (!isSetupComplete) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house" drawable="ic_menu_home" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="catalog">
        <NativeTabs.Trigger.Label>Catalog</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="square.grid.2x2" drawable="ic_menu_agenda" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="checkout">
        <NativeTabs.Trigger.Label>Checkout</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="qrcode" drawable="ic_menu_camera" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="confirmation">
        <NativeTabs.Trigger.Label>Confirmation</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="checkmark.circle" drawable="ic_menu_send" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gearshape" drawable="ic_menu_manage" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
