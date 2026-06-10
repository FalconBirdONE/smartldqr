import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';

import { TrustChip } from '@/components/ldqr/trust-chip';
import { Palette, Radius, Space, Type } from '@/constants/design';
import { useBasket } from '@/context/basket';
import { TransactionStore } from '@/services/transaction-store';
import type { CheckoutLine } from '@/types/checkout';

/**
 * Tap & Pay payment page.
 *
 * Structure + green ripple animation are copied verbatim from the palm payment
 * surface (`PalmConfirm`); only the palm-specific copy is replaced with tap/NFC
 * phrasing. The confirm/success flow is identical: a short steady-hold settles,
 * the transaction is logged, and we land on the shared confirmation page.
 * "Skip — use UPI PIN instead" is the always-available fallback.
 */

const RING = 220;

export default function TapAndPayScreen() {
  const router = useRouter();
  const { clearBasket } = useBasket();
  const params = useLocalSearchParams<{ source?: string; total?: string; basket?: string }>();

  const source = params.source === 'qsr' ? 'qsr' : 'retail';
  const lines = useMemo<CheckoutLine[]>(() => {
    try {
      return params.basket ? (JSON.parse(params.basket) as CheckoutLine[]) : [];
    } catch {
      return [];
    }
  }, [params.basket]);
  const total = Number(params.total) || lines.reduce((s, l) => s + l.subtotal, 0);
  const itemCount = lines.reduce((n, l) => n + l.quantity, 0);

  const [error, setError] = useState<string | null>(null);
  const settled = useRef(false);

  // Log the (simulated) settlement and route to the shared confirmation page.
  const complete = useCallback(
    async (methodLabel: string) => {
      if (settled.current) return;
      settled.current = true;
      try {
        const transactionId = await TransactionStore.logTransaction({
          total_amount: total,
          payment_method: methodLabel,
          basket_snapshot: JSON.stringify(lines),
          item_count: itemCount,
        });
        if (source === 'retail') {
          await clearBasket();
        }
        router.replace({
          pathname: '/confirmation',
          params: {
            transaction_id: transactionId,
            total_amount: String(total),
            timestamp: new Date().toISOString(),
            method: methodLabel,
            app: 'Tap & Pay',
          },
        });
      } catch (e) {
        settled.current = false;
        setError(e instanceof Error ? e.message : 'Payment failed. Nothing was charged — try again.');
      }
    },
    [total, lines, itemCount, source, clearBasket, router]
  );

  // ── Green ripple animation (copied from PalmConfirm) ─────────────────────
  const [ring] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(ring, {
        toValue: 1,
        duration: 1800,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    const id = setTimeout(() => void complete('Tap & Pay'), 2600);
    return () => {
      loop.stop();
      ring.setValue(0);
      clearTimeout(id);
    };
  }, [ring, complete]);

  const ringStyle = (delay: number) => ({
    transform: [
      {
        scale: ring.interpolate({ inputRange: [0, 1], outputRange: [0.7 + delay, 1.25 + delay] }),
      },
    ],
    opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
  });

  return (
    <View style={styles.screen}>
      <View style={styles.top}>
        <TrustChip label="Tap & Pay · on-device · Never leaves the store" tone="light" icon="🔒" />
      </View>

      <View style={styles.center}>
        <View style={styles.rings}>
          <Animated.View style={[styles.ring, ringStyle(0)]} />
          <Animated.View style={[styles.ring, ringStyle(0.18)]} />
          <View style={styles.disc}>
            <Text style={styles.icon}>📱</Text>
          </View>
        </View>
        <Text style={styles.title}>Tap your phone on receiver</Text>
        <Text style={styles.sub}>Reading your UPI app to authorise this payment…</Text>
        <Text style={styles.amount}>₹{total.toLocaleString('en-IN')}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={styles.bottom}>
        <Pressable onPress={() => void complete('Tap & Pay · UPI PIN')} style={styles.skip}>
          <Text style={styles.skipText}>Skip — use UPI PIN instead</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Palette.greenDeep,
    paddingVertical: Space.xxxl,
    paddingHorizontal: Space.xxl,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  top: { alignItems: 'center' },
  center: { alignItems: 'center', gap: Space.md },
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
  disc: {
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: 'rgba(52, 211, 153, 0.16)',
    borderWidth: 2,
    borderColor: '#34D399',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 64 },
  title: { fontSize: Type.title, fontWeight: '700', color: Palette.onColor },
  sub: { fontSize: Type.body, color: 'rgba(255,255,255,0.75)', textAlign: 'center' },
  amount: {
    fontSize: Type.amount,
    fontWeight: '800',
    color: Palette.onColor,
    letterSpacing: -0.5,
    marginTop: Space.md,
  },
  error: {
    fontSize: Type.bodySmall,
    color: '#FCA5A5',
    textAlign: 'center',
    marginTop: Space.sm,
  },
  bottom: { width: '100%', alignItems: 'center' },
  skip: {
    paddingVertical: Space.lg,
    paddingHorizontal: Space.xxl,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  skipText: { color: Palette.onColor, fontSize: Type.body, fontWeight: '600' },
});
