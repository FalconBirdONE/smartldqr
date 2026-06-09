import { StyleSheet, Text, View } from 'react-native';

import { Palette, Radius, Space, Type } from '@/constants/design';

type Tone = 'neutral' | 'green' | 'teal' | 'light';

const TONES: Record<Tone, { bg: string; fg: string; dot: string }> = {
  neutral: { bg: Palette.cardMuted, fg: Palette.inkSecondary, dot: Palette.inkMuted },
  green: { bg: Palette.greenSoft, fg: Palette.greenStrong, dot: Palette.green },
  teal: { bg: Palette.tealSoft, fg: Palette.tealInk, dot: Palette.teal },
  light: { bg: 'rgba(255,255,255,0.16)', fg: '#FFFFFF', dot: '#FFFFFF' },
};

/**
 * Small status pill that surfaces a trust/compliance signal — e.g.
 * "Camera private", "Secure", "DPDP Act compliant". A leading dot carries the
 * tone colour; trust signals are surfaced, never hidden.
 */
export function TrustChip({
  label,
  tone = 'neutral',
  icon,
}: {
  label: string;
  tone?: Tone;
  icon?: string;
}) {
  const t = TONES[tone];
  return (
    <View style={[styles.chip, { backgroundColor: t.bg }]}>
      {icon ? (
        <Text style={[styles.icon, { color: t.fg }]}>{icon}</Text>
      ) : (
        <View style={[styles.dot, { backgroundColor: t.dot }]} />
      )}
      <Text style={[styles.label, { color: t.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm - 2,
    borderRadius: Radius.pill,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  icon: {
    fontSize: Type.caption,
  },
  label: {
    fontSize: Type.caption,
    fontWeight: '600',
  },
});
