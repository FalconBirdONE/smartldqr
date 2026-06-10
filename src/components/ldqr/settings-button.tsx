import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cardShadow, Palette, Space } from '@/constants/design';

/** Hidden pre-setup, on Settings itself, and on the immersive payment pages. */
const HIDDEN_PATHS = ['/onboarding', '/settings', '/upi-lite', '/upi-lite-tap'];

/**
 * Floating Settings entry, fixed top-right. Mounted once in the root layout
 * as an overlay above the Stack so it is present on every module screen.
 */
export function SettingsButton() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  if (HIDDEN_PATHS.includes(pathname)) {
    return null;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Open settings"
      hitSlop={8}
      style={[styles.button, { top: insets.top + Space.md, right: insets.right + Space.md }]}
      onPress={() => router.push('/settings')}
    >
      <Text style={styles.icon}>⚙️</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.card,
    borderWidth: 1,
    borderColor: Palette.border,
    ...cardShadow,
  },
  icon: { fontSize: 20 },
});
