import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StyleSheet, useColorScheme, View } from 'react-native';

import { SettingsButton } from '@/components/ldqr/settings-button';
import { BasketProvider } from '@/context/basket';
import { BrandProvider } from '@/context/brand';
import { MerchantSetupProvider } from '@/context/merchant-setup';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <MerchantSetupProvider>
      <BrandProvider>
        <BasketProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <View style={styles.fill}>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="qsr" />
              </Stack>
              {/* Persistent overlay: Settings entry, top-right on every module screen. */}
              <SettingsButton />
            </View>
          </ThemeProvider>
        </BasketProvider>
      </BrandProvider>
    </MerchantSetupProvider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
