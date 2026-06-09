import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { cardShadow, Palette, Radius, Space, Type } from '@/constants/design';

/**
 * The payment QR card on the left payment surface.
 * Shows the amount (large + coloured), the QR, the merchant VPA and a
 * refresh/expiry line. The QR DIMS when a phone tap is detected, nudging the
 * customer to the Tap & Pay zone instead of scanning.
 */
export function QrCard({
  amount,
  vpa,
  qrValue,
  accent = Palette.indigo,
  dimmed = false,
}: {
  amount: number;
  vpa: string;
  qrValue: string;
  accent?: string;
  dimmed?: boolean;
}) {
  // A simple visible expiry countdown from 4:00 — the QR auto-refreshes as the
  // basket changes; here it just keeps the "expires" line alive. The parent
  // remounts this card (key={qrValue}) when the QR refreshes, resetting it.
  const [secondsLeft, setSecondsLeft] = useState(240);
  useEffect(() => {
    const id = setInterval(() => setSecondsLeft((s) => (s <= 1 ? 240 : s - 1)), 1000);
    return () => clearInterval(id);
  }, []);

  const mm = Math.floor(secondsLeft / 60);
  const ss = String(secondsLeft % 60).padStart(2, '0');

  return (
    <View style={styles.card}>
      <Text style={styles.payLabel}>Pay this total</Text>
      <Text style={[styles.amount, { color: accent }]}>₹{amount.toLocaleString('en-IN')}</Text>

      <View style={styles.qrWrap}>
        <View style={[styles.qrBox, dimmed && styles.qrDimmed]}>
          <QRCode value={qrValue || 'ldqr'} size={196} color={Palette.ink} backgroundColor="#FFFFFF" />
        </View>
        {dimmed ? (
          <View style={styles.dimOverlay}>
            <Text style={styles.dimText}>Reading your tap…</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.vpa}>{vpa}</Text>
      <Text style={styles.expiry}>
        Refreshed now · expires {mm}:{ss}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    paddingVertical: Space.xl,
    paddingHorizontal: Space.xl,
    alignItems: 'center',
    ...cardShadow,
  },
  payLabel: {
    fontSize: Type.body,
    color: Palette.inkSecondary,
    fontWeight: '600',
  },
  amount: {
    fontSize: Type.amountHero,
    fontWeight: '800',
    letterSpacing: -1,
    marginTop: Space.xs,
    marginBottom: Space.lg,
  },
  qrWrap: {
    position: 'relative',
  },
  qrBox: {
    padding: Space.md,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  qrDimmed: {
    opacity: 0.18,
  },
  dimOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimText: {
    fontSize: Type.body,
    fontWeight: '700',
    color: Palette.amberStrong,
  },
  vpa: {
    fontSize: Type.body,
    color: Palette.ink,
    fontWeight: '600',
    marginTop: Space.lg,
  },
  expiry: {
    fontSize: Type.caption,
    color: Palette.inkMuted,
    marginTop: Space.xs,
  },
});
