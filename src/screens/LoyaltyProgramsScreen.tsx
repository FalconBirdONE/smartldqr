import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Eyebrow } from '@/components/ldqr/eyebrow';
import { Palette, Radius, Space, Type } from '@/constants/design';

/**
 * Loyalty Programs — shell only. Reachable from the cashier billing screen;
 * the real programme management UI is not built yet.
 */
export default function LoyaltyProgramsScreen() {
  const router = useRouter();

  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Eyebrow color={Palette.pink}>Loyalty Programs</Eyebrow>
        <Text style={styles.title}>Coming Soon</Text>
        <Text style={styles.body}>
          Customer loyalty programmes, points and rewards will live here.
        </Text>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
        >
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Space.xl,
  },
  card: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    padding: Space.xxl,
    alignItems: 'center',
    gap: Space.sm,
  },
  title: {
    fontSize: Type.display,
    fontWeight: '800',
    color: Palette.ink,
    letterSpacing: -0.5,
  },
  body: {
    fontSize: Type.body,
    color: Palette.inkSecondary,
    textAlign: 'center',
  },
  backBtn: {
    marginTop: Space.xl,
    paddingVertical: Space.md,
    paddingHorizontal: Space.xxl,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Palette.borderStrong,
  },
  backBtnPressed: { opacity: 0.85 },
  backText: { fontSize: Type.body, fontWeight: '700', color: Palette.ink },
});
