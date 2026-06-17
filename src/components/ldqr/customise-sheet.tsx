import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Eyebrow } from '@/components/ldqr/eyebrow';
import { PrimaryButton } from '@/components/ldqr/primary-button';
import { Palette, Radius, Space, trayShadow, Type } from '@/constants/design';
import { MEAL_UPGRADE, SAUCE_CHIPS, SPICE_CHIPS, type MenuItem } from '@/constants/qsr-menu';
import type { LineOptions } from '@/context/qsr-order';

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

/**
 * Customisation sheet for a menu item. Leads with the "Make it a meal" combo
 * upsell, then spice/sauce chips. The opt-out ("No thanks") is always visible —
 * upsells never block, and the running price is clear.
 */
export function CustomiseSheet({
  visible,
  item,
  onAdd,
  onClose,
}: {
  visible: boolean;
  item: MenuItem | null;
  onAdd: (options: LineOptions) => void;
  onClose: () => void;
}) {
  const [meal, setMeal] = useState(false);
  const [spice, setSpice] = useState('Medium');
  const [sauce, setSauce] = useState('Mint');

  if (!item) return null;
  const price = item.price + (meal ? MEAL_UPGRADE.price : 0);

  const reset = () => {
    setMeal(false);
    setSpice('Medium');
    setSauce('Mint');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <View style={styles.flex}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.desc}>{item.desc}</Text>
            </View>
          </View>

          {/* Make it a meal — combo upsell. */}
          <Pressable
            onPress={() => setMeal((m) => !m)}
            style={[styles.meal, meal && styles.mealSelected]}
          >
            <View style={styles.flex}>
              <Eyebrow color={meal ? Palette.amberInk : Palette.inkMuted}>Make it a meal · popular</Eyebrow>
              <Text style={[styles.mealTitle, meal && { color: Palette.amberInk }]}>
                {MEAL_UPGRADE.sub}
              </Text>
            </View>
            <Text style={[styles.mealPrice, meal && { color: Palette.amberInk }]}>
              +₹{MEAL_UPGRADE.price}
            </Text>
            <View style={[styles.check, meal && styles.checkOn]}>
              {meal ? <Text style={styles.checkMark}>✓</Text> : null}
            </View>
          </Pressable>

          <Eyebrow style={styles.groupLabel}>Spice level</Eyebrow>
          <View style={styles.chipRow}>
            {SPICE_CHIPS.map((s) => (
              <Chip key={s} label={s} selected={spice === s} onPress={() => setSpice(s)} />
            ))}
          </View>

          <Eyebrow style={styles.groupLabel}>Sauce</Eyebrow>
          <View style={styles.chipRow}>
            {SAUCE_CHIPS.map((s) => (
              <Chip key={s} label={s} selected={sauce === s} onPress={() => setSauce(s)} />
            ))}
          </View>

          <View style={styles.actions}>
            <Pressable
              style={styles.noThanks}
              onPress={() => {
                onAdd({});
                reset();
              }}
            >
              <Text style={styles.noThanksText}>No thanks · add plain</Text>
            </Pressable>
            <PrimaryButton
              label={`Add · ₹${price}`}
              variant="amber"
              size="md"
              style={styles.flex}
              onPress={() => {
                onAdd({ meal, spice, sauce });
                reset();
              }}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: {
    flex: 1,
    backgroundColor: Palette.scrim,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Palette.card,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Space.xl,
    paddingBottom: Space.xxl,
    ...trayShadow,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: Palette.borderStrong,
    marginBottom: Space.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    marginBottom: Space.lg,
  },
  emoji: { fontSize: 40 },
  flex: { flex: 1 },
  name: { fontSize: Type.title, fontWeight: '700', color: Palette.ink },
  desc: { fontSize: Type.bodySmall, color: Palette.inkSecondary, marginTop: 2 },
  meal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Palette.border,
    backgroundColor: Palette.cardMuted,
    padding: Space.lg,
  },
  mealSelected: {
    borderColor: Palette.amber,
    backgroundColor: Palette.amberSoft,
  },
  mealTitle: { fontSize: Type.body, fontWeight: '700', color: Palette.ink, marginTop: 2 },
  mealPrice: { fontSize: Type.body, fontWeight: '800', color: Palette.inkSecondary },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: Palette.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: {
    backgroundColor: Palette.amber,
    borderColor: Palette.amber,
  },
  checkMark: { color: '#3B2400', fontWeight: '800', fontSize: Type.bodySmall },
  groupLabel: { marginTop: Space.lg, marginBottom: Space.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  chip: {
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Palette.border,
    backgroundColor: Palette.card,
  },
  chipSelected: {
    borderColor: Palette.teal,
    backgroundColor: Palette.tealSoft,
  },
  chipText: { fontSize: Type.bodySmall, fontWeight: '600', color: Palette.inkSecondary },
  chipTextSelected: { color: Palette.tealInk },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    marginTop: Space.xl,
  },
  noThanks: {
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Palette.borderStrong,
  },
  noThanksText: { fontSize: Type.bodySmall, fontWeight: '600', color: Palette.inkSecondary },
});
