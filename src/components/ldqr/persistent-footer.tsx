import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Palette, Radius, Space, Type } from '@/constants/design';

export type FooterKey = 'tap' | 'palm' | 'emi' | 'loyalty' | 'language';

type Tone = { soft: string; ink: string; bar: string };

const TONE: Record<FooterKey, Tone> = {
  tap: { soft: Palette.tealSoft, ink: Palette.tealInk, bar: Palette.teal },
  palm: { soft: Palette.greenSoft, ink: Palette.greenStrong, bar: Palette.green },
  emi: { soft: Palette.indigoSoft, ink: Palette.indigoInk, bar: Palette.indigo },
  loyalty: { soft: Palette.pinkSoft, ink: Palette.pinkInk, bar: Palette.pink },
  language: { soft: Palette.amberSoft, ink: Palette.amberInk, bar: Palette.amber },
};

const ICON: Record<FooterKey, string> = {
  tap: '📲',
  palm: '🖐️',
  emi: '%',
  loyalty: '♥',
  language: '🌐',
};

const LANGS = ['EN', 'हिंदी', 'ಕನ್ನಡ'];

/**
 * The persistent footer — always five cells:
 *   Tap & Pay | Palm | EMI | Loyalty | Language
 * The active or contextually-relevant cell takes a colour spotlight. EMI shows
 * "·₹X/mo" when eligible; Loyalty relabels per merchant; Language cycles
 * EN / हिंदी / ಕನ್ನಡ with a "+9 more" affordance.
 */
export function PersistentFooter({
  active,
  emiPerMonth,
  loyaltyLabel,
  onSelect,
}: {
  active?: FooterKey;
  emiPerMonth?: number | null;
  loyaltyLabel: string;
  onSelect?: (key: FooterKey) => void;
}) {
  const [langIndex, setLangIndex] = useState(0);

  const cells: { key: FooterKey; label: string; sub?: string }[] = [
    { key: 'tap', label: 'Tap & Pay' },
    { key: 'palm', label: 'Palm' },
    {
      key: 'emi',
      label: 'EMI',
      sub: emiPerMonth ? `·₹${emiPerMonth.toLocaleString('en-IN')}/mo` : undefined,
    },
    { key: 'loyalty', label: loyaltyLabel },
    { key: 'language', label: LANGS[langIndex], sub: '+9 more' },
  ];

  return (
    <View style={styles.footer}>
      {cells.map((cell) => {
        const tone = TONE[cell.key];
        const isActive = active === cell.key;
        return (
          <Pressable
            key={cell.key}
            style={[styles.cell, isActive && { backgroundColor: tone.soft }]}
            onPress={() => {
              if (cell.key === 'language') {
                setLangIndex((i) => (i + 1) % LANGS.length);
              }
              onSelect?.(cell.key);
            }}
          >
            {isActive ? <View style={[styles.spotlight, { backgroundColor: tone.bar }]} /> : null}
            <Text style={[styles.icon, isActive && { color: tone.ink }]}>{ICON[cell.key]}</Text>
            <Text style={[styles.label, isActive && { color: tone.ink, fontWeight: '700' }]}>
              {cell.label}
            </Text>
            {cell.sub ? (
              <Text style={[styles.sub, isActive && { color: tone.ink }]}>{cell.sub}</Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    flexDirection: 'row',
    backgroundColor: Palette.card,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Space.md,
    gap: 2,
    overflow: 'hidden',
  },
  spotlight: {
    position: 'absolute',
    top: 0,
    height: 3,
    left: '18%',
    right: '18%',
    borderBottomLeftRadius: Radius.pill,
    borderBottomRightRadius: Radius.pill,
  },
  icon: {
    fontSize: Type.body,
    color: Palette.inkMuted,
  },
  label: {
    fontSize: Type.caption,
    fontWeight: '600',
    color: Palette.inkSecondary,
  },
  sub: {
    fontSize: Type.micro,
    color: Palette.inkMuted,
    fontWeight: '600',
  },
});
