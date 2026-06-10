import { type Href, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Eyebrow } from '@/components/ldqr/eyebrow';
import { PalmConfirm } from '@/components/ldqr/palm-confirm';
import { PrimaryButton } from '@/components/ldqr/primary-button';
import { TrustChip } from '@/components/ldqr/trust-chip';
import { cardShadow, Palette, Radius, Space, Type } from '@/constants/design';
import { useBasket } from '@/context/basket';
import { useResponsive } from '@/hooks/use-responsive';
import {
  buildEmiMatrix,
  buildLenderPayload,
  EMI_LENDERS,
  type EmiLenderPayload,
  type EmiQuote,
} from '@/services/emi';
import { authorizePalm, PalmAuthError } from '@/services/palm-auth';
import { TransactionStore } from '@/services/transaction-store';
import type { CheckoutLine } from '@/types/checkout';

/**
 * Shared payment surface, reused by the unified checkout and the cashier
 * billing screen. Top: the live UPI QR (regenerates with the total) + a
 * "Simulate Payment" shortcut to confirmation. Bottom: the payment matrix —
 * Tap & Pay (green ripple full-page flow), RuPay, Pay@Palm and EMI.
 *
 * Every inline rail funnels through one `completePayment` (simulated rail →
 * transaction log → retail basket cleanup → confirmation); failures are caught
 * into an error banner and the surface stays interactive. Tap & Pay instead
 * routes to the dedicated `/tap-and-pay` page, which logs + confirms itself.
 */

type MethodKey = 'tapandpay' | 'rupay' | 'palm' | 'emi';

const METHODS: { key: MethodKey; icon: string; label: string; sub: string }[] = [
  { key: 'tapandpay', icon: '⚡', label: 'Tap & Pay', sub: 'Fast · low-value rail' },
  { key: 'rupay', icon: '💳', label: 'Pay using RuPay', sub: 'Credit · debit' },
  { key: 'palm', icon: '🖐️', label: 'Pay@Palm', sub: 'Biometric · on-device' },
  { key: 'emi', icon: '%', label: 'EMI', sub: 'Split the bill' },
];

const RUPAY_CARD = { label: 'RuPay Credit ••8842', network: 'RuPay' };

const UPI_VPA = 'merchant@upi';
const UPI_PN = 'MerchantName';

/** Short txn-shaped id for the UPI note (tn=LDQR-{id}). */
const makeTxnId = () => Math.random().toString(36).slice(2, 10).toUpperCase();

/** Standard UPI intent. Built per-render (never memoised) so the QR stays live. */
const buildUpi = (total: number, txnId: string) =>
  `upi://pay?pa=${UPI_VPA}&pn=${UPI_PN}&am=${total.toFixed(2)}&cu=INR&tn=LDQR-${txnId}`;

/** Simulated rail latency — consistent with the simulated-QR flow's pacing. */
const simulateRail = () => new Promise<void>((resolve) => setTimeout(resolve, 900));

export type PaymentMatrixProps = {
  lines: CheckoutLine[];
  total: number;
  source: 'retail' | 'qsr';
  style?: StyleProp<ViewStyle>;
};

export function PaymentMatrix({ lines, total, source, style }: PaymentMatrixProps) {
  const router = useRouter();
  const { clearBasket } = useBasket();
  const { isTablet } = useResponsive();

  const itemCount = lines.reduce((n, l) => n + l.quantity, 0);

  const [method, setMethod] = useState<MethodKey | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [palmVisible, setPalmVisible] = useState(false);
  const [lenderId, setLenderId] = useState(EMI_LENDERS[0].id);
  const [emiQuote, setEmiQuote] = useState<EmiQuote | null>(null);
  const [payload, setPayload] = useState<EmiLenderPayload | null>(null);
  const [txnId] = useState(makeTxnId);

  // Guarded: an unquotable total yields empty rows, never a crash.
  const emiMatrix = useMemo(() => {
    try {
      return buildEmiMatrix(total);
    } catch {
      return [];
    }
  }, [total]);
  const lenderRow = emiMatrix.find((row) => row.lender.id === lenderId) ?? emiMatrix[0];

  // ── Terminal step every inline rail funnels into ─────────────────────────
  const completePayment = useCallback(
    async (
      methodLabel: string,
      opts: { app?: string; bank?: string; emi?: { months: number; perMonth: number } } = {}
    ) => {
      if (processing) return;
      if (total <= 0 || lines.length === 0) {
        setError('Nothing to pay — the bill is empty.');
        return;
      }
      setProcessing(true);
      setError(null);
      try {
        await simulateRail();
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
            app: opts.app ?? 'Smart LDQR',
            bank: opts.bank ?? '',
            points: '0',
            emi_months: opts.emi ? String(opts.emi.months) : '',
            emi_per_month: opts.emi ? String(opts.emi.perMonth) : '',
          },
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Payment failed. Nothing was charged — try again.');
      } finally {
        setProcessing(false);
      }
    },
    [processing, total, lines, itemCount, source, clearBasket, router]
  );

  // Tap & Pay opens the dedicated green-ripple page, carrying the bill so that
  // page can log + confirm on its own.
  const openTapAndPay = useCallback(() => {
    // Cast: new route; the typed-routes manifest picks it up on next regen.
    router.push({
      pathname: '/tap-and-pay',
      params: { source, total: String(total), basket: JSON.stringify(lines) },
    } as unknown as Href);
  }, [router, source, total, lines]);

  const pickMethod = (key: MethodKey) => {
    if (key === 'tapandpay') {
      openTapAndPay();
      return;
    }
    setMethod(key);
    setError(null);
  };

  // ── Pay@Palm ─────────────────────────────────────────────────────────────
  const handlePalmCaptured = useCallback(async () => {
    setPalmVisible(false);
    try {
      const auth = await authorizePalm({ amount: total, reference: `ldqr-palm-${Date.now()}` });
      if (auth.status === 'authorised') {
        await completePayment('Pay@Palm', { app: 'Palm rail', bank: `auth ${auth.authToken.slice(0, 12)}` });
      } else {
        setError('Palm authorisation returned an unexpected status.');
      }
    } catch (e) {
      if (e instanceof PalmAuthError) {
        setError(`${e.message} (${e.code}) — try again or use UPI PIN.`);
      } else {
        setError(e instanceof Error ? e.message : 'Palm authorisation failed.');
      }
    }
  }, [total, completePayment]);

  const handlePalmSkip = useCallback(() => {
    setPalmVisible(false);
    void completePayment('Pay@Palm · UPI PIN', { app: 'UPI PIN fallback' });
  }, [completePayment]);

  // ── EMI ──────────────────────────────────────────────────────────────────
  const previewPayload = useCallback(() => {
    if (!lenderRow || !emiQuote) return;
    try {
      setPayload(
        buildLenderPayload({
          lender: lenderRow.lender,
          quote: emiQuote,
          principal: total,
          reference: `ldqr-emi-${Date.now()}`,
        })
      );
      setError(null);
    } catch (e) {
      setPayload(null);
      setError(e instanceof Error ? e.message : 'Could not build the lender payload.');
    }
  }, [lenderRow, emiQuote, total]);

  const confirmEmi = useCallback(() => {
    if (!lenderRow || !emiQuote) return;
    try {
      buildLenderPayload({
        lender: lenderRow.lender,
        quote: emiQuote,
        principal: total,
        reference: `ldqr-emi-${Date.now()}`,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not build the lender payload.');
      return;
    }
    void completePayment(`EMI · ${lenderRow.lender.name}`, {
      bank: lenderRow.lender.name,
      emi: { months: emiQuote.months, perMonth: emiQuote.perMonth },
    });
  }, [lenderRow, emiQuote, total, completePayment]);

  // ── Per-method panes ───────────────────────────────────────────────────
  const methodPane = () => {
    switch (method) {
      case 'rupay':
        return (
          <View style={styles.pane}>
            <View style={styles.optionRowStatic}>
              <Text style={styles.optionEmoji}>💳</Text>
              <View style={styles.flex}>
                <Text style={styles.optionTitle}>{RUPAY_CARD.label}</Text>
                <Text style={styles.optionSub}>{RUPAY_CARD.network} · tap, insert or swipe on the reader</Text>
              </View>
            </View>
            <PrimaryButton
              label={`Charge ₹${total.toLocaleString('en-IN')} to RuPay`}
              variant="dark"
              disabled={processing}
              onPress={() => void completePayment('RuPay', { app: 'POS reader', bank: RUPAY_CARD.label })}
            />
          </View>
        );
      case 'palm':
        return (
          <View style={styles.pane}>
            <TrustChip label="Template on-device only · UPI-PIN fallback always" tone="green" icon="🔒" />
            <PrimaryButton
              label="Scan palm to pay"
              subLabel={`Authorises ₹${total.toLocaleString('en-IN')}`}
              variant="teal"
              icon="🖐️"
              disabled={processing}
              onPress={() => {
                setError(null);
                setPalmVisible(true);
              }}
            />
          </View>
        );
      case 'emi': {
        if (!lenderRow || lenderRow.quotes.length === 0) {
          return (
            <View style={styles.pane}>
              <Text style={styles.paneNote}>EMI is unavailable for this bill amount.</Text>
            </View>
          );
        }
        return (
          <View style={styles.pane}>
            <View style={styles.chipRow}>
              {emiMatrix.map((row) => (
                <Pressable
                  key={row.lender.id}
                  style={[styles.chip, lenderId === row.lender.id && styles.chipActive]}
                  onPress={() => {
                    setLenderId(row.lender.id);
                    setEmiQuote(null);
                    setPayload(null);
                  }}
                >
                  <Text style={[styles.chipText, lenderId === row.lender.id && styles.chipTextActive]}>
                    {row.lender.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.table}>
              <View style={[styles.tableRow, styles.tableHead]}>
                <Text style={[styles.th, styles.colMonths]}>Tenure</Text>
                <Text style={[styles.th, styles.colNum]}>Per month</Text>
                <Text style={[styles.th, styles.colNum]}>APR</Text>
                <Text style={[styles.th, styles.colNum]}>Interest</Text>
                <Text style={[styles.th, styles.colNum]}>Total</Text>
              </View>
              {lenderRow.quotes.map((q) => {
                const selected = emiQuote?.months === q.months;
                return (
                  <Pressable
                    key={q.months}
                    style={[styles.tableRow, selected && styles.tableRowSelected]}
                    onPress={() => {
                      setEmiQuote(q);
                      setPayload(null);
                    }}
                  >
                    <View style={styles.colMonths}>
                      <Text style={[styles.td, styles.tdStrong]}>{q.months} mo</Text>
                      {q.noCost ? <Text style={styles.noCost}>NO-COST</Text> : null}
                    </View>
                    <Text style={[styles.td, styles.colNum]}>₹{q.perMonth.toLocaleString('en-IN')}</Text>
                    <Text style={[styles.td, styles.colNum]}>{q.apr}%</Text>
                    <Text style={[styles.td, styles.colNum]}>₹{q.interest.toLocaleString('en-IN')}</Text>
                    <Text style={[styles.td, styles.colNum]}>₹{q.totalPayable.toLocaleString('en-IN')}</Text>
                  </Pressable>
                );
              })}
            </View>

            {payload ? (
              <View style={styles.payloadBox}>
                <Eyebrow color={Palette.indigo}>Lender payload · mock</Eyebrow>
                <Text style={styles.payloadText}>
                  {JSON.stringify({ ...payload, schedule: payload.schedule.slice(0, 3) }, null, 2)}
                </Text>
                {payload.schedule.length > 3 ? (
                  <Text style={styles.payloadMore}>
                    … {payload.schedule.length - 3} more instalments in schedule
                  </Text>
                ) : null}
              </View>
            ) : null}

            <View style={styles.emiActions}>
              <PrimaryButton
                label="Preview lender payload"
                variant="ghost"
                size="md"
                disabled={!emiQuote || processing}
                onPress={previewPayload}
                style={styles.flex}
              />
              <PrimaryButton
                label={emiQuote ? `Confirm ${emiQuote.months}-month EMI` : 'Pick a tenure'}
                subLabel={emiQuote ? `₹${emiQuote.perMonth.toLocaleString('en-IN')}/mo` : undefined}
                variant="indigo"
                size="md"
                disabled={!emiQuote || processing}
                onPress={confirmEmi}
                style={styles.flex}
              />
            </View>
            <Text style={styles.kfs}>RBI Key Fact Statement shown before any real lender confirm.</Text>
          </View>
        );
      }
      default:
        return <Text style={styles.paneNote}>Pick a payment method to continue.</Text>;
    }
  };

  // QR value recomputed every render (no memo) so it tracks the live total.
  const qrValue = buildUpi(total, txnId);

  return (
    <View style={[styles.stack, style]}>
      {/* Top: live UPI QR + simulate shortcut. Row on tablet (QR beside its
          action) so the wide card isn't a tall, sparse centred stack. */}
      <View style={styles.card}>
        <Eyebrow color={Palette.teal}>UPI · scan to pay</Eyebrow>
        <View style={[styles.qrBody, isTablet && styles.qrBodyRow]}>
          <View style={styles.qrFrame}>
            <QRCode
              key={qrValue}
              value={qrValue}
              size={isTablet ? 208 : 184}
              color={Palette.ink}
              backgroundColor="#FFFFFF"
            />
          </View>
          <View style={[styles.qrSide, isTablet && styles.qrSideTablet]}>
            <Text style={styles.qrAmount}>₹{total.toLocaleString('en-IN')}</Text>
            <Text style={styles.qrCaption}>{UPI_VPA}</Text>
            <PrimaryButton
              label="Simulate Payment"
              variant="teal"
              size="md"
              disabled={processing || total <= 0}
              onPress={() => void completePayment('UPI', { app: 'UPI' })}
              style={styles.simulateBtn}
            />
            <Text style={styles.helperNote}>
              For faster low-value payments, consider Tap &amp; Pay
            </Text>
          </View>
        </View>
      </View>

      {/* Bottom: payment matrix. */}
      <View style={styles.card}>
        <Eyebrow color={Palette.indigo}>Payment matrix · all methods available</Eyebrow>
        <View style={styles.methodGrid}>
          {METHODS.map((m) => (
            <Pressable
              key={m.key}
              style={[styles.method, method === m.key && styles.methodActive]}
              onPress={() => pickMethod(m.key)}
            >
              <Text style={styles.methodIcon}>{m.icon}</Text>
              <Text style={[styles.methodLabel, method === m.key && styles.methodLabelActive]}>
                {m.label}
              </Text>
              <Text style={styles.methodSub}>{m.sub}</Text>
            </Pressable>
          ))}
        </View>

        {error ? (
          <View style={styles.errorRow}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {processing ? (
          <View style={styles.processingRow}>
            <ActivityIndicator color={Palette.indigo} />
            <Text style={styles.processingText}>Processing — simulated rail…</Text>
          </View>
        ) : null}

        {methodPane()}
      </View>

      <PalmConfirm visible={palmVisible} onConfirm={() => void handlePalmCaptured()} onSkip={handlePalmSkip} />
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: Space.lg },
  card: { backgroundColor: Palette.card, borderRadius: Radius.lg, padding: Space.xl, ...cardShadow },
  flex: { flex: 1 },

  // QR box
  qrBody: { alignItems: 'center', gap: Space.xl, marginTop: Space.lg },
  qrBodyRow: { flexDirection: 'row', alignItems: 'center' },
  qrFrame: {
    padding: Space.md,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  qrSide: { alignSelf: 'stretch', alignItems: 'center', gap: Space.sm },
  qrSideTablet: { flex: 1, alignItems: 'flex-start' },
  qrAmount: { fontSize: Type.amount, fontWeight: '800', color: Palette.ink, letterSpacing: -0.5 },
  qrCaption: { fontSize: Type.caption, color: Palette.inkSecondary, fontWeight: '600' },
  simulateBtn: { alignSelf: 'stretch', marginTop: Space.sm },
  helperNote: {
    fontSize: Type.caption,
    color: Palette.inkMuted,
  },

  // Method grid
  methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.md, marginTop: Space.md },
  method: {
    flexGrow: 1,
    flexBasis: 150,
    alignItems: 'center',
    gap: 2,
    backgroundColor: Palette.cardMuted,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Palette.border,
    paddingVertical: Space.lg,
    paddingHorizontal: Space.sm,
  },
  methodActive: { borderColor: Palette.indigo, backgroundColor: Palette.indigoSoft },
  methodIcon: { fontSize: Type.title },
  methodLabel: { fontSize: Type.bodySmall, fontWeight: '700', color: Palette.inkSecondary },
  methodLabelActive: { color: Palette.indigoInk },
  methodSub: { fontSize: Type.micro, color: Palette.inkMuted },

  errorRow: { backgroundColor: Palette.dangerSoft, borderRadius: Radius.sm, padding: Space.md, marginTop: Space.lg },
  errorText: { color: Palette.danger, fontSize: Type.bodySmall, fontWeight: '600' },
  processingRow: { flexDirection: 'row', alignItems: 'center', gap: Space.md, marginTop: Space.lg },
  processingText: { color: Palette.inkSecondary, fontSize: Type.bodySmall },

  pane: { marginTop: Space.lg, gap: Space.lg },
  paneNote: { color: Palette.inkMuted, fontSize: Type.body, marginTop: Space.lg },
  optionRowStatic: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    backgroundColor: Palette.cardMuted,
    borderRadius: Radius.md,
    padding: Space.lg,
  },
  optionEmoji: { fontSize: Type.title },
  optionTitle: { fontSize: Type.body, fontWeight: '700', color: Palette.ink },
  optionSub: { fontSize: Type.caption, color: Palette.inkSecondary, marginTop: 1 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  chip: {
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Palette.border,
    backgroundColor: Palette.cardMuted,
  },
  chipActive: { borderColor: Palette.indigo, backgroundColor: Palette.indigoSoft },
  chipText: { fontSize: Type.bodySmall, fontWeight: '600', color: Palette.inkSecondary },
  chipTextActive: { color: Palette.indigoInk, fontWeight: '700' },

  table: { borderWidth: 1, borderColor: Palette.border, borderRadius: Radius.md, overflow: 'hidden' },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
    gap: Space.sm,
  },
  tableHead: { backgroundColor: Palette.cardMuted },
  tableRowSelected: { backgroundColor: Palette.indigoSoft },
  th: { fontSize: Type.micro, fontWeight: '800', color: Palette.inkMuted, textTransform: 'uppercase', letterSpacing: 0.6 },
  td: { fontSize: Type.bodySmall, color: Palette.ink },
  tdStrong: { fontWeight: '700' },
  colMonths: { flex: 1.1 },
  colNum: { flex: 1, textAlign: 'right' },
  noCost: { fontSize: 9, fontWeight: '800', color: Palette.greenStrong, letterSpacing: 0.5 },

  payloadBox: {
    backgroundColor: Palette.cardMuted,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
    padding: Space.lg,
  },
  payloadText: {
    fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
    fontSize: Type.micro,
    color: Palette.inkSecondary,
    marginTop: Space.sm,
  },
  payloadMore: { fontSize: Type.micro, color: Palette.inkMuted, marginTop: Space.xs },
  emiActions: { flexDirection: 'row', gap: Space.md },
  kfs: { fontSize: Type.caption, color: Palette.inkMuted, textAlign: 'center' },
});
