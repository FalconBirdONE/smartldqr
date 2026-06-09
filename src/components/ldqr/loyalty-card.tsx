import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Palette, Radius, Space, Type } from '@/constants/design';

/**
 * Tap-to-loyalty card — pink, the loyalty rail colour. "Join ___ Club while you
 * pay?" with one-tap enrol, explicit consent and the DPDP Act line. No dark
 * patterns: a visible "No thanks" opt-out sits next to the join action.
 */
export function LoyaltyCard({
  programLabel,
  joined,
  onJoin,
  onDismiss,
}: {
  programLabel: string;
  joined: boolean;
  onJoin: () => void;
  onDismiss: () => void;
}) {
  if (joined) {
    return (
      <View style={[styles.card, styles.joinedCard]}>
        <Text style={styles.joinedIcon}>♥</Text>
        <View style={styles.body}>
          <Text style={styles.joinedTitle}>You’re in — {programLabel}</Text>
          <Text style={styles.joinedSub}>Points will be added to this payment.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.heartIcon}>♥</Text>
        <Text style={styles.title}>Join {programLabel} while you pay?</Text>
      </View>
      <Text style={styles.consent}>
        One tap enrols this phone number. We’ll use it only for {programLabel} rewards · DPDP
        Act compliant.
      </Text>
      <View style={styles.actions}>
        <Pressable onPress={onDismiss} style={[styles.btn, styles.dismiss]}>
          <Text style={styles.dismissText}>No thanks</Text>
        </Pressable>
        <Pressable onPress={onJoin} style={[styles.btn, styles.join]}>
          <Text style={styles.joinText}>Join · one tap</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.pinkSoft,
    borderRadius: Radius.md,
    padding: Space.lg,
    borderWidth: 1,
    borderColor: '#F9A8D4',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  heartIcon: {
    fontSize: Type.heading,
    color: Palette.pink,
  },
  title: {
    flex: 1,
    fontSize: Type.body,
    fontWeight: '700',
    color: Palette.pinkInk,
  },
  consent: {
    fontSize: Type.caption,
    color: Palette.pinkInk,
    opacity: 0.85,
    marginTop: Space.sm,
    marginBottom: Space.md,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: Space.md,
  },
  btn: {
    borderRadius: Radius.pill,
    paddingVertical: Space.md,
    alignItems: 'center',
  },
  dismiss: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#F9A8D4',
  },
  dismissText: {
    color: Palette.pinkInk,
    fontWeight: '600',
    fontSize: Type.bodySmall,
  },
  join: {
    flex: 1.4,
    backgroundColor: Palette.pink,
  },
  joinText: {
    color: Palette.onColor,
    fontWeight: '700',
    fontSize: Type.bodySmall,
  },
  joinedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    backgroundColor: Palette.pinkSoft,
  },
  joinedIcon: {
    fontSize: Type.title,
    color: Palette.pink,
  },
  body: { flex: 1 },
  joinedTitle: {
    fontSize: Type.body,
    fontWeight: '700',
    color: Palette.pinkInk,
  },
  joinedSub: {
    fontSize: Type.caption,
    color: Palette.pinkInk,
    opacity: 0.85,
    marginTop: 1,
  },
});
