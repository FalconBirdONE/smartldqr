import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { Palette, Radius, Space, Type } from '@/constants/design';

export type TapState = 'idle' | 'detecting' | 'reading';

const COPY: Record<TapState, { title: string; sub: string }> = {
  idle: { title: 'Or tap your phone here', sub: 'UPI Tap & Pay' },
  detecting: { title: 'Phone detected · hold steady', sub: 'Keep your phone on the zone' },
  reading: { title: 'Reading your UPI app…', sub: 'Almost there' },
};

const SUPPORTED = 'PhonePe · GPay · Paytm · BHIM';

/**
 * Amber "tap your phone here" zone on the payment surface. Pulses while idle to
 * say "do this next", then goes SOLID amber once a tap is detected. Tapping it
 * simulates a phone presenting (idle → detecting → reading → onComplete).
 */
export function TapAndPayZone({
  state,
  onPress,
}: {
  state: TapState;
  onPress?: () => void;
}) {
  const [pulse] = useState(() => new Animated.Value(0));
  const active = state !== 'idle';

  useEffect(() => {
    if (active) {
      pulse.stopAnimation();
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, pulse]);

  const bg = active ? Palette.amberStrong : Palette.amberSoft;
  const fg = active ? Palette.onColor : Palette.amberInk;
  const borderColor = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [Palette.amber, Palette.amberStrong],
  });
  const copy = COPY[state];

  return (
    <Pressable onPress={onPress} disabled={active}>
      <Animated.View
        style={[
          styles.zone,
          { backgroundColor: bg },
          active ? styles.zoneSolid : { borderColor },
        ]}
      >
        <View style={[styles.iconBubble, active && styles.iconBubbleSolid]}>
          <Text style={[styles.icon, { color: active ? Palette.amberStrong : Palette.onColor }]}>
            ((•))
          </Text>
        </View>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: fg }]}>{copy.title}</Text>
          <Text style={[styles.sub, { color: active ? Palette.onColor : Palette.amberInk }]}>
            {active ? copy.sub : SUPPORTED}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  zone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.lg,
    paddingVertical: Space.lg,
    paddingHorizontal: Space.xl,
    borderRadius: Radius.pill,
    borderWidth: 2,
  },
  zoneSolid: {
    borderWidth: 2,
    borderColor: Palette.amberStrong,
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.amber,
  },
  iconBubbleSolid: {
    backgroundColor: Palette.onColor,
  },
  icon: {
    fontSize: Type.bodySmall,
    fontWeight: '800',
  },
  copy: {
    flex: 1,
  },
  title: {
    fontSize: Type.body,
    fontWeight: '700',
  },
  sub: {
    fontSize: Type.caption,
    marginTop: 2,
    fontWeight: '600',
  },
});
