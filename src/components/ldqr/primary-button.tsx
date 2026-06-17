import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Palette, Radius, Space, Type } from '@/constants/design';

type Variant = 'amber' | 'teal' | 'indigo' | 'pink' | 'dark' | 'ghost';

const VARIANTS: Record<Variant, { bg: string; fg: string; border?: string }> = {
  amber: { bg: Palette.amber, fg: '#3B2400' },
  teal: { bg: Palette.teal, fg: Palette.onColor },
  indigo: { bg: Palette.indigo, fg: Palette.onColor },
  pink: { bg: Palette.pink, fg: Palette.onColor },
  dark: { bg: Palette.ink, fg: Palette.onColor },
  ghost: { bg: 'transparent', fg: Palette.ink, border: Palette.borderStrong },
};

/**
 * The standard kiosk action button — a soft pill in one of the functional
 * rail colours. Large hit target by default (kiosk = finger-first).
 */
export function PrimaryButton({
  label,
  onPress,
  variant = 'amber',
  size = 'lg',
  disabled,
  loading,
  icon,
  subLabel,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  subLabel?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const v = VARIANTS[variant];
  const isDisabled = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        { backgroundColor: v.bg },
        v.border ? { borderWidth: 1.5, borderColor: v.border } : null,
        pressed && !isDisabled ? styles.pressed : null,
        isDisabled ? styles.disabled : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.content}>
          {icon ? <Text style={[styles.icon, { color: v.fg }]}>{icon}</Text> : null}
          <View>
            <Text
              style={[styles.label, size === 'lg' ? styles.labelLg : styles.labelMd, { color: v.fg }]}
            >
              {label}
            </Text>
            {subLabel ? (
              <Text style={[styles.subLabel, { color: v.fg }]}>{subLabel}</Text>
            ) : null}
          </View>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  md: {
    paddingVertical: Space.md,
    paddingHorizontal: Space.xl,
  },
  lg: {
    paddingVertical: Space.lg + 2,
    paddingHorizontal: Space.xxl,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  icon: {
    fontSize: Type.heading,
  },
  label: {
    fontWeight: '700',
    textAlign: 'center',
  },
  labelMd: { fontSize: Type.body },
  labelLg: { fontSize: Type.heading },
  subLabel: {
    fontSize: Type.caption,
    opacity: 0.8,
    textAlign: 'center',
    marginTop: 1,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.92,
  },
  disabled: {
    opacity: 0.45,
  },
});
