import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { BasketPanel, type BasketLine } from '@/components/ldqr/basket-panel';
import { EmiBanner, EmiTray, lowestEmiPerMonth, type EmiOption } from '@/components/ldqr/emi';
import { LoyaltyCard } from '@/components/ldqr/loyalty-card';
import { PalmConfirm } from '@/components/ldqr/palm-confirm';
import { PersistentFooter, type FooterKey } from '@/components/ldqr/persistent-footer';
import { PrimaryButton } from '@/components/ldqr/primary-button';
import { QrCard } from '@/components/ldqr/qr-card';
import { SplitLayout } from '@/components/ldqr/split-layout';
import { TapAndPayZone, type TapState } from '@/components/ldqr/tap-and-pay-zone';
import { TrustChip } from '@/components/ldqr/trust-chip';
import { useBasket } from '@/context/basket';
import { useBrand } from '@/context/brand';
import { EMI_THRESHOLD, Palette, Space, Type, UPI_LITE_LIMIT } from '@/constants/design';
import { TransactionStore } from '@/services/transaction-store';

// UUID-shaped value for the simulated QR — not a real payment URI in this
// phase. The basket argument only marks that a fresh code is derived per
// basket revision.
const generateSimulatedQrValue = (_basket?: unknown): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r % 4) + 8;
    return v.toString(16);
  });

const APP = 'GPay';
const BANK = 'HDFC ••4291';

export default function CheckoutScreen() {
  const router = useRouter();
  const { brand } = useBrand();

  const { items, total, hydrated, error: basketError, clearBasket } = useBasket();
  const [error, setError] = useState<string | null>(null);

  // QR auto-refreshes as the basket changes: a fresh simulated value per
  // basket revision.
  const qrValue = useMemo(() => generateSimulatedQrValue(items), [items]);

  // Payment journey state.
  const [tapState, setTapState] = useState<TapState>('idle');
  const [showPalm, setShowPalm] = useState(false);
  const [emiTrayOpen, setEmiTrayOpen] = useState(false);
  const [chosenEmi, setChosenEmi] = useState<EmiOption | null>(null);
  const [loyaltyJoined, setLoyaltyJoined] = useState(false);
  const [loyaltyDismissed, setLoyaltyDismissed] = useState(false);
  const methodRef = useRef<string>('UPI');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useFocusEffect(
    useCallback(() => {
      return () => timers.current.forEach(clearTimeout);
    }, [])
  );

  const eligibleEmi = total >= EMI_THRESHOLD;
  const isLite = total > 0 && total < UPI_LITE_LIMIT;

  const lines: BasketLine[] = items.map((it) => ({
    id: it.basket_id,
    name: it.sku_name,
    quantity: it.quantity,
    subtotal: it.subtotal,
  }));

  const completePayment = useCallback(
    async (method: string, emi: EmiOption | null) => {
      try {
        const transactionId = await TransactionStore.logTransaction({
          total_amount: total,
          payment_method: method,
          basket_snapshot: JSON.stringify(items),
          item_count: items.reduce((sum, it) => sum + it.quantity, 0),
        });
        await clearBasket();
        router.replace({
          pathname: '/confirmation',
          params: {
            transaction_id: transactionId,
            total_amount: String(total),
            timestamp: new Date().toISOString(),
            method,
            app: APP,
            bank: BANK,
            points: String(loyaltyJoined ? Math.round(total / 10) : 0),
            emi_months: emi ? String(emi.months) : '',
            emi_per_month: emi ? String(emi.perMonth) : '',
          },
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Payment simulation failed. Please try again.');
        setTapState('idle');
        setShowPalm(false);
      }
    },
    [items, total, loyaltyJoined, clearBasket, router]
  );

  // After the rail authorises, gate on biometrics: UPI Lite skips the PIN/palm
  // for small tickets; anything else raises the palm confirmation.
  const authGate = useCallback(
    (method: string, emi: EmiOption | null) => {
      methodRef.current = method;
      setChosenEmi(emi);
      if (total < UPI_LITE_LIMIT) {
        void completePayment(method, emi);
      } else {
        setShowPalm(true);
      }
    },
    [total, completePayment]
  );

  const startTap = useCallback(() => {
    if (tapState !== 'idle' || items.length === 0) return;
    setTapState('detecting');
    timers.current.push(setTimeout(() => setTapState('reading'), 950));
    timers.current.push(
      setTimeout(() => {
        setTapState('idle');
        authGate('UPI Tap & Pay', null);
      }, 2000)
    );
  }, [tapState, items.length, authGate]);

  if (!hydrated) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Palette.indigo} />
        <Text style={styles.loadingText}>Loading basket…</Text>
      </View>
    );
  }

  const footerActive: FooterKey = showPalm
    ? 'palm'
    : emiTrayOpen || chosenEmi
      ? 'emi'
      : loyaltyJoined
        ? 'loyalty'
        : 'tap';

  const left = (
    <ScrollView contentContainerStyle={styles.leftContent} showsVerticalScrollIndicator={false}>
      <QrCard
        key={qrValue}
        amount={total}
        vpa={brand.vpa}
        qrValue={qrValue}
        accent={Palette.indigo}
        dimmed={tapState !== 'idle'}
      />

      <TapAndPayZone state={tapState} onPress={startTap} />

      {isLite ? (
        <TrustChip label="UPI Lite · no PIN under ₹500" tone="teal" icon="⚡" />
      ) : null}

      {eligibleEmi ? <EmiBanner total={total} onOpen={() => setEmiTrayOpen(true)} /> : null}

      <PrimaryButton
        label="Scan & pay"
        subLabel="Simulate a QR scan"
        variant="teal"
        icon="▢"
        disabled={items.length === 0 || tapState !== 'idle'}
        onPress={() => authGate('UPI QR', null)}
      />
    </ScrollView>
  );

  const right = (
    <BasketPanel
      title="Your basket"
      eyebrow="Itemised bill"
      lines={lines}
      total={total}
      footerSlot={
        loyaltyJoined || loyaltyDismissed ? (
          loyaltyJoined ? (
            <View style={styles.loyaltyWrap}>
              <LoyaltyCard
                programLabel={brand.loyaltyLabel}
                joined
                onJoin={() => {}}
                onDismiss={() => {}}
              />
            </View>
          ) : null
        ) : (
          <View style={styles.loyaltyWrap}>
            <LoyaltyCard
              programLabel={brand.loyaltyLabel}
              joined={false}
              onJoin={() => setLoyaltyJoined(true)}
              onDismiss={() => setLoyaltyDismissed(true)}
            />
          </View>
        )
      }
    />
  );

  return (
    <View style={styles.fill}>
      <SplitLayout
        header={
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>Checkout</Text>
              <Text style={styles.headerSub}>{brand.name} · Scan, tap or pay later</Text>
            </View>
            <TrustChip label="Secure · UPI" tone="green" icon="🔒" />
          </View>
        }
        left={left}
        right={right}
        footer={
          <PersistentFooter
            active={footerActive}
            emiPerMonth={eligibleEmi ? lowestEmiPerMonth(total) : null}
            loyaltyLabel={brand.loyaltyLabel}
            onSelect={(key) => {
              if (key === 'tap') startTap();
              if (key === 'emi' && eligibleEmi) setEmiTrayOpen(true);
              if (key === 'palm' && items.length > 0) authGate('UPI · Palm', null);
              if (key === 'loyalty' && !loyaltyJoined) setLoyaltyJoined(true);
            }}
          />
        }
      />

      {error ?? basketError ? <Text style={styles.error}>{error ?? basketError}</Text> : null}

      <EmiTray
        visible={emiTrayOpen}
        total={total}
        onClose={() => setEmiTrayOpen(false)}
        onContinue={(option) => {
          setEmiTrayOpen(false);
          authGate('Credit Line on UPI', option);
        }}
      />

      <PalmConfirm
        visible={showPalm}
        onConfirm={() => {
          setShowPalm(false);
          void completePayment(methodRef.current, chosenEmi);
        }}
        onSkip={() => {
          setShowPalm(false);
          void completePayment(`${methodRef.current} · UPI PIN`, chosenEmi);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: Palette.canvas },
  leftContent: {
    gap: Space.lg,
    paddingBottom: Space.lg,
  },
  loyaltyWrap: {
    marginTop: Space.lg,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.md,
    backgroundColor: Palette.canvas,
  },
  loadingText: {
    color: Palette.inkSecondary,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: Type.title,
    fontWeight: '800',
    color: Palette.ink,
  },
  headerSub: {
    fontSize: Type.caption,
    color: Palette.inkSecondary,
    marginTop: 2,
  },
  error: {
    color: Palette.danger,
    textAlign: 'center',
    paddingVertical: Space.sm,
    backgroundColor: Palette.dangerSoft,
  },
});
