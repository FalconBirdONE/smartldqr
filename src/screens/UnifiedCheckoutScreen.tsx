import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { Eyebrow } from '@/components/ldqr/eyebrow';
import { PalmConfirm } from '@/components/ldqr/palm-confirm';
import { PrimaryButton } from '@/components/ldqr/primary-button';
import { TrustChip } from '@/components/ldqr/trust-chip';
import { cardShadow, Palette, Radius, SCREEN_GUTTER, Space, Type, UPI_LITE_LIMIT } from '@/constants/design';
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

type MethodKey = 'lite' | 'rupay' | 'palm' | 'emi';

const METHODS: { key: MethodKey; icon: string; label: string; sub: string }[] = [
  { key: 'lite', icon: '⚡', label: 'UPI Lite', sub: 'No PIN under ₹500' },
  { key: 'rupay', icon: '💳', label: 'Pay using RuPay', sub: 'Credit · debit' },
  { key: 'palm', icon: '🖐️', label: 'Pay@Palm', sub: 'Biometric · on-device' },
  { key: 'emi', icon: '%', label: 'EMI', sub: 'Split the bill' },
];

const RUPAY_CARD = { label: 'RuPay Credit ••8842', network: 'RuPay' };

// ── Unified QR + UPI box ────────────────────────────────────────────────
type UpiSub = 'standard' | 'lite' | 'litetap';

const UPI_SUBS: { key: UpiSub; label: string; sub: string }[] = [
  { key: 'standard', label: 'UPI Standard', sub: 'Scan with any UPI app' },
  { key: 'lite', label: 'UPI LITE', sub: 'Low-value, no-PIN rail' },
  { key: 'litetap', label: 'UPI LITE TAP', sub: 'Tap to pay · confirm below' },
];

const UPI_VPA = 'merchant@upi';
const UPI_PN = 'MerchantName';

/** Short txn-shaped id for the UPI note (tn=LDQR-{id}). */
const makeTxnId = () => Math.random().toString(36).slice(2, 10).toUpperCase();

/** Standard UPI intent. Built per-render (never memoised) so the QR stays live. */
const buildUpiStandard = (total: number, txnId: string) =>
  `upi://pay?pa=${UPI_VPA}&pn=${UPI_PN}&am=${total.toFixed(2)}&cu=INR&tn=LDQR-${txnId}`;

/** UPI LITE intent — same target with the LITE-rail flags appended. */
const buildUpiLite = (total: number, txnId: string) =>
  `${buildUpiStandard(total, txnId)}&mode=lite&purpose=00&mc=5499`;

/** Simulated rail latency — consistent with the simulated-QR flow's pacing. */
const simulateRail = () => new Promise<void>((resolve) => setTimeout(resolve, 900));

/**
 * The unified checkout — target of CaptureCheckout's "Confirm checkout"
 * (U1/U2, source=retail) and the U4 QSR handoff (source=qsr). Renders the
 * passed basket and the full payment matrix with no per-method gating.
 * Every method resolves through the same simulated rail; every failure is
 * caught into the error banner and the screen stays interactive.
 */
export default function UnifiedCheckoutScreen() {
  const router = useRouter();
  const { isTablet } = useResponsive();
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

  const [method, setMethod] = useState<MethodKey | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Method-pane state.
  const [palmVisible, setPalmVisible] = useState(false);
  const [lenderId, setLenderId] = useState(EMI_LENDERS[0].id);

  // Unified QR + UPI box state.
  const [upiSub, setUpiSub] = useState<UpiSub>('standard');
  const [txnId] = useState(makeTxnId);
  const [emiQuote, setEmiQuote] = useState<EmiQuote | null>(null);
  const [payload, setPayload] = useState<EmiLenderPayload | null>(null);

  // Guarded: an unquotable total yields empty rows, never a crash.
  const emiMatrix = useMemo(() => {
    try {
      return buildEmiMatrix(total);
    } catch {
      return [];
    }
  }, [total]);
  const lenderRow = emiMatrix.find((row) => row.lender.id === lenderId) ?? emiMatrix[0];

  const pickMethod = (key: MethodKey) => {
    setMethod(key);
    setError(null);
  };

  /**
   * The one terminal step every rail funnels into: simulated settlement,
   * transaction log, basket cleanup, confirmation. Always fails safe.
   */
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
          // The QSR order lives in its own provider; only the retail basket
          // is owned (and cleared) here.
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

  // ── Pay@Palm ──────────────────────────────────────────────────────────
  // The PalmConfirm overlay simulates the steady-hold capture; the
  // (simulated) biometric authorisation then runs behind a try/catch with
  // an explicit success-response handler, mirroring a real SDK call.
  const handlePalmCaptured = useCallback(async () => {
    setPalmVisible(false);
    try {
      const auth = await authorizePalm({ amount: total, reference: `ldqr-palm-${Date.now()}` });
      // Success-response handler: only an 'authorised' result proceeds.
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

  // ── UPI box navigation ───────────────────────────────────────────────────
  // UPI LITE / UPI LITE TAP each open a dedicated full-page flow, carrying the
  // current bill so that page can log + confirm on its own.
  const openUpiPage = useCallback(
    (path: '/upi-lite' | '/upi-lite-tap') => {
      // Cast: new routes; the typed-routes manifest picks them up on next regen.
      router.push({
        pathname: path,
        params: { source, total: String(total), basket: JSON.stringify(lines) },
      } as unknown as Href);
    },
    [router, source, total, lines]
  );

  // ── EMI ───────────────────────────────────────────────────────────────
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
      // The payload would be posted to the lender here; mocked until wired.
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

  // ── Per-method panes ──────────────────────────────────────────────────

  const isLite = total > 0 && total < UPI_LITE_LIMIT;

  const methodPane = () => {
    switch (method) {
      case 'lite':
        return (
          <View style={styles.pane}>
            <TrustChip
              label={isLite ? 'No PIN needed under ₹500' : 'Above ₹500 — UPI PIN will be asked'}
              tone="teal"
              icon="⚡"
            />
            <PrimaryButton
              label={`Pay ₹${total.toLocaleString('en-IN')} with UPI Lite`}
              subLabel={isLite ? 'One tap, no PIN' : 'PIN on the next step'}
              variant="teal"
              disabled={processing}
              onPress={() => void completePayment(isLite ? 'UPI Lite' : 'UPI Lite · PIN', { app: 'UPI Lite' })}
            />
          </View>
        );
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
            {/* Lender selector (interest tables differ per lender) */}
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

            {/* Term matrix: tenure × (per month, APR, interest, total) */}
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

            {/* Mock lender payload preview */}
            {payload ? (
              <View style={styles.payloadBox}>
                <Eyebrow color={Palette.indigo}>Lender payload · mock</Eyebrow>
                <Text style={styles.payloadText}>
                  {JSON.stringify(
                    { ...payload, schedule: payload.schedule.slice(0, 3) },
                    null,
                    2
                  )}
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
            <Text style={styles.kfs}>
              RBI Key Fact Statement shown before any real lender confirm.
            </Text>
          </View>
        );
      }
      default:
        return <Text style={styles.paneNote}>Pick a payment method to continue.</Text>;
    }
  };

  const summary = (
    <View style={[styles.card, isTablet && styles.summaryTablet]}>
      <Eyebrow color={Palette.teal}>Itemised bill</Eyebrow>
      {lines.map((l) => (
        <View key={l.id} style={styles.line}>
          <Text style={styles.lineQty}>{l.quantity}×</Text>
          <View style={styles.flex}>
            <Text style={styles.lineName}>{l.name}</Text>
            {l.note ? <Text style={styles.lineNote}>{l.note}</Text> : null}
          </View>
          <Text style={styles.linePrice}>₹{l.subtotal.toLocaleString('en-IN')}</Text>
        </View>
      ))}
      {lines.length === 0 ? <Text style={styles.paneNote}>No items received.</Text> : null}
      <View style={styles.divider} />
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>₹{total.toLocaleString('en-IN')}</Text>
      </View>
    </View>
  );

  const matrix = (
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
  );

  // Live QR value for the unified box — recomputed every render (no memo) so it
  // updates the instant the sub-option (or total) changes.
  const upiQrValue =
    upiSub === 'standard' ? buildUpiStandard(total, txnId) : buildUpiLite(total, txnId);

  const upiBox = (
    <View style={styles.card}>
      <Eyebrow color={Palette.teal}>UPI · scan or tap to pay</Eyebrow>
      <View style={[styles.upiBody, isTablet && styles.upiBodyRow]}>
        {/* Left: live QR, regenerated per sub-option. */}
        <View style={styles.qrSide}>
          <View style={styles.qrFrame}>
            <QRCode
              key={upiQrValue}
              value={upiQrValue}
              size={168}
              color={Palette.ink}
              backgroundColor="#FFFFFF"
            />
          </View>
          <Text style={styles.qrCaption}>
            {upiSub === 'standard' ? 'UPI Standard QR' : 'UPI LITE QR'} · ₹
            {total.toLocaleString('en-IN')}
          </Text>
        </View>

        {/* Right: stacked, selectable sub-options. */}
        <View style={styles.upiOptions}>
          {UPI_SUBS.map((opt) => {
            const active = upiSub === opt.key;
            return (
              <Pressable
                key={opt.key}
                style={[styles.upiOption, active && styles.upiOptionActive]}
                onPress={() => setUpiSub(opt.key)}
              >
                <Text style={[styles.upiOptionLabel, active && styles.upiOptionLabelActive]}>
                  {opt.label}
                </Text>
                <Text style={styles.upiOptionSub}>{opt.sub}</Text>
              </Pressable>
            );
          })}

          {upiSub === 'standard' ? (
            <PrimaryButton
              label="Simulate Payment"
              variant="teal"
              size="md"
              disabled={processing}
              onPress={() => void completePayment('UPI Standard', { app: 'UPI' })}
            />
          ) : (
            <PrimaryButton
              label={upiSub === 'lite' ? 'Open UPI LITE' : 'Open UPI LITE TAP'}
              subLabel="Tap to Pay"
              variant="teal"
              size="md"
              disabled={processing}
              onPress={() => openUpiPage(upiSub === 'lite' ? '/upi-lite' : '/upi-lite-tap')}
            />
          )}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Eyebrow>{source === 'qsr' ? 'U4 · QSR order' : 'Unified checkout'}</Eyebrow>
          <Text style={styles.title}>Pay ₹{total.toLocaleString('en-IN')}</Text>
          <Text style={styles.subtitle}>
            {itemCount} item{itemCount === 1 ? '' : 's'} · pick any method — nothing is gated.
          </Text>
        </View>

        {isTablet ? (
          <View style={styles.bodyTablet}>
            {summary}
            <View style={styles.rightCol}>
              {matrix}
              {upiBox}
            </View>
          </View>
        ) : (
          <>
            {summary}
            {matrix}
            {upiBox}
          </>
        )}

        <PrimaryButton
          label="Back"
          variant="ghost"
          size="md"
          onPress={() => router.back()}
          style={styles.backBtn}
        />
      </ScrollView>

      <PalmConfirm visible={palmVisible} onConfirm={() => void handlePalmCaptured()} onSkip={handlePalmSkip} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.canvas },
  scroll: { padding: SCREEN_GUTTER, gap: Space.lg },
  header: { gap: 2, paddingRight: 60 },
  title: { fontSize: Type.display, fontWeight: '800', color: Palette.ink, letterSpacing: -0.5 },
  subtitle: { fontSize: Type.bodySmall, color: Palette.inkSecondary },
  bodyTablet: { flexDirection: 'row', gap: Space.lg, alignItems: 'flex-start' },
  card: { backgroundColor: Palette.card, borderRadius: Radius.lg, padding: Space.xl, ...cardShadow },
  summaryTablet: { flex: 1 },
  rightCol: { flex: 1.4, gap: Space.lg },
  flex: { flex: 1 },

  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    paddingVertical: Space.md,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  lineQty: { fontSize: Type.body, fontWeight: '800', color: Palette.inkSecondary, minWidth: 28 },
  lineName: { fontSize: Type.body, fontWeight: '600', color: Palette.ink },
  lineNote: { fontSize: Type.caption, color: Palette.inkMuted, marginTop: 1 },
  linePrice: { fontSize: Type.body, fontWeight: '700', color: Palette.ink },
  divider: { height: 1, backgroundColor: Palette.border, marginVertical: Space.md },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  totalLabel: { fontSize: Type.heading, fontWeight: '700', color: Palette.ink },
  totalValue: { fontSize: Type.amount, fontWeight: '800', color: Palette.ink, letterSpacing: -0.5 },

  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.md,
    marginTop: Space.md,
  },
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

  errorRow: {
    backgroundColor: Palette.dangerSoft,
    borderRadius: Radius.sm,
    padding: Space.md,
    marginTop: Space.lg,
  },
  errorText: { color: Palette.danger, fontSize: Type.bodySmall, fontWeight: '600' },
  processingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    marginTop: Space.lg,
  },
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

  table: {
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
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

  // Unified QR + UPI box
  upiBody: { marginTop: Space.lg, gap: Space.lg },
  upiBodyRow: { flexDirection: 'row', alignItems: 'flex-start' },
  qrSide: { alignItems: 'center', gap: Space.md },
  qrFrame: {
    padding: Space.md,
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  qrCaption: { fontSize: Type.caption, color: Palette.inkSecondary, fontWeight: '600' },
  upiOptions: { flex: 1, gap: Space.md },
  upiOption: {
    backgroundColor: Palette.cardMuted,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Palette.border,
    paddingVertical: Space.md,
    paddingHorizontal: Space.lg,
  },
  upiOptionActive: { borderColor: Palette.teal, backgroundColor: Palette.tealSoft },
  upiOptionLabel: { fontSize: Type.body, fontWeight: '700', color: Palette.inkSecondary },
  upiOptionLabelActive: { color: Palette.tealInk },
  upiOptionSub: { fontSize: Type.caption, color: Palette.inkMuted, marginTop: 1 },

  backBtn: { alignSelf: 'flex-start' },
});
