import { useEffect, useState } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { TrustChip } from '@/components/ldqr/trust-chip';
import { Palette, Radius, Space, Type } from '@/constants/design';

/**
 * Palm confirmation — a dark-green full screen with concentric guide rings.
 * Biometrics ALWAYS offer a UPI-PIN fallback, and the privacy line makes clear
 * the template stays on-device. Auto-confirms after a short steady-hold for the
 * simulation; "Skip — use UPI PIN instead" is always visible.
 */
export function PalmConfirm({
  visible,
  onConfirm,
  onSkip,
}: {
  visible: boolean;
  onConfirm: () => void;
  onSkip: () => void;
}) {
  const [ring] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(
      Animated.timing(ring, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    const id = setTimeout(onConfirm, 2600);
    return () => {
      loop.stop();
      ring.setValue(0);
      clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const ringStyle = (delay: number) => ({
    transform: [
      {
        scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.7 + delay, 1.25 + delay] }),
      },
    ],
    opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
  });

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onSkip}>
      <View style={styles.screen}>
        <View style={styles.top}>
          <TrustChip label="Template on-device only · Never leaves the store" tone="light" icon="🔒" />
        </View>

        <View style={styles.center}>
          <View style={styles.rings}>
            <Animated.View style={[styles.ring, ringStyle(0)]} />
            <Animated.View style={[styles.ring, ringStyle(0.18)]} />
            <View style={styles.palmDisc}>
              <Text style={styles.palmIcon}>🖐️</Text>
            </View>
          </View>
          <Text style={styles.title}>Hold your palm steady</Text>
          <Text style={styles.sub}>Reading your palm to authorise this payment…</Text>
        </View>

        <View style={styles.bottom}>
          <Pressable onPress={onSkip} style={styles.skip}>
            <Text style={styles.skipText}>Skip — use UPI PIN instead</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const RING = 220;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.greenDeep,
    paddingVertical: Space.xxxl,
    paddingHorizontal: Space.xxl,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  top: {
    alignItems: 'center',
  },
  center: {
    alignItems: 'center',
    gap: Space.md,
  },
  rings: {
    width: RING,
    height: RING,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Space.xl,
  },
  ring: {
    position: 'absolute',
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 2,
    borderColor: '#34D399',
  },
  palmDisc: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: 'rgba(52, 211, 153, 0.16)',
    borderWidth: 2,
    borderColor: '#34D399',
    alignItems: 'center',
    justifyContent: 'center',
  },
  palmIcon: {
    fontSize: 64,
  },
  title: {
    fontSize: Type.title,
    fontWeight: '700',
    color: Palette.onColor,
  },
  sub: {
    fontSize: Type.body,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
  },
  bottom: {
    width: '100%',
    alignItems: 'center',
  },
  skip: {
    paddingVertical: Space.lg,
    paddingHorizontal: Space.xxl,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  skipText: {
    color: Palette.onColor,
    fontSize: Type.body,
    fontWeight: '600',
  },
});
