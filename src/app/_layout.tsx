import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { MerchantSetupProvider } from '@/context/merchant-setup';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <MerchantSetupProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </ThemeProvider>
    </MerchantSetupProvider>
  );
}
