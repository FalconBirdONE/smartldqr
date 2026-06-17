import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Eyebrow } from '@/components/ldqr/eyebrow';
import { PrimaryButton } from '@/components/ldqr/primary-button';
import { Palette, Radius, Space, trayShadow, Type } from '@/constants/design';

export type EmiOption = {
  months: number;
  perMonth: number;
  /** 0 for the no-cost option, otherwise the headline APR. */
  apr: number;
  noCost: boolean;
  featured?: boolean;
};

/** A merchant pre-approved limit for the demo Credit Line on UPI. */
export const PRE_APPROVED_LIMIT = 60000;

/** Build the three standard tenure options for a basket total. */
export function buildEmiOptions(total: number): EmiOption[] {
  const round = (n: number) => Math.round(n);
  return [
    { months: 3, perMonth: round(total / 3), apr: 0, noCost: true, featured: true },
    { months: 6, perMonth: round((total * 1.07) / 6), apr: 14, noCost: false },
    { months: 12, perMonth: round((total * 1.14) / 12), apr: 16, noCost: false },
  ];
}

/** The lowest per-month figure, for the footer cell + banner copy. */
export function lowestEmiPerMonth(total: number): number {
  return buildEmiOptions(total).reduce((min, o) => Math.min(min, o.perMonth), Infinity);
}

/**
 * Inline EMI banner shown on the payment surface once the basket crosses the
 * threshold. Indigo — the EMI rail colour. Tapping opens the tenure tray.
 */
export function EmiBanner({ total, onOpen }: { total: number; onOpen: () => void }) {
  const perMonth = buildEmiOptions(total)[0].perMonth;
  return (
    <Pressable onPress={onOpen} style={styles.banner}>
      <View style={styles.bannerIcon}>
        <Text style={styles.bannerIconText}>%</Text>
      </View>
      <View style={styles.bannerBody}>
        <Text style={styles.bannerTitle}>
          EMI from ₹{perMonth.toLocaleString('en-IN')}/month
        </Text>
        <Text style={styles.bannerSub}>No-cost 3-month option · via Credit Line on UPI</Text>
      </View>
      <Text style={styles.bannerChevron}>›</Text>
    </Pressable>
  );
}

/**
 * The tenure TRAY. Dims the backdrop and raises from the bottom; lists the
 * no-cost 3-month option (featured), 6mo and 12mo with APR, the pre-approved
 * limit, a "Continue with N months" CTA and the RBI Key Fact Statement line.
 */
export function EmiTray({
  visible,
  total,
  onClose,
  onContinue,
}: {
  visible: boolean;
  total: number;
  onClose: () => void;
  onContinue: (option: EmiOption) => void;
}) {
  const options = buildEmiOptions(total);
  const [selected, setSelected] = useState(0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose}>
        <Pressable style={styles.tray} onPress={(e) => e.stopPropagation()}>
          <View style={styles.handle} />
          <Eyebrow color={Palette.indigo}>Credit Line on UPI</Eyebrow>
          <Text style={styles.trayTitle}>Split into easy EMIs</Text>
          <Text style={styles.limit}>
            Pre-approved limit ₹{PRE_APPROVED_LIMIT.toLocaleString('en-IN')}
          </Text>

          <View style={styles.options}>
            {options.map((o, i) => {
              const isSel = i === selected;
              return (
                <Pressable
                  key={o.months}
                  onPress={() => setSelected(i)}
                  style={[styles.option, isSel && styles.optionSelected]}
                >
                  <View style={styles.optionTop}>
                    <Text style={styles.optionMonths}>{o.months} months</Text>
                    {o.featured ? (
                      <View style={styles.featuredTag}>
                        <Text style={styles.featuredText}>NO-COST</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.optionPerMonth}>
                    ₹{o.perMonth.toLocaleString('en-IN')}
                    <Text style={styles.optionPerMonthUnit}>/mo</Text>
                  </Text>
                  <Text style={styles.optionApr}>
                    {o.noCost ? 'No interest, no fees' : `${o.apr}% APR`}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <PrimaryButton
            label={`Continue with ${options[selected].months} months`}
            variant="indigo"
            onPress={() => onContinue(options[selected])}
          />
          <Text style={styles.kfs}>
            Subject to RBI Key Fact Statement · interest & charges shown before you confirm
          </Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    backgroundColor: Palette.indigoSoft,
    borderRadius: Radius.md,
    padding: Space.lg,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Palette.indigo,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerIconText: {
    color: Palette.onColor,
    fontSize: Type.heading,
    fontWeight: '800',
  },
  bannerBody: { flex: 1 },
  bannerTitle: {
    fontSize: Type.body,
    fontWeight: '700',
    color: Palette.indigoInk,
  },
  bannerSub: {
    fontSize: Type.caption,
    color: Palette.indigoInk,
    opacity: 0.8,
    marginTop: 1,
  },
  bannerChevron: {
    fontSize: Type.title,
    color: Palette.indigo,
    fontWeight: '700',
  },
  scrim: {
    flex: 1,
    backgroundColor: Palette.scrim,
    justifyContent: 'flex-end',
  },
  tray: {
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
  trayTitle: {
    fontSize: Type.title,
    fontWeight: '700',
    color: Palette.ink,
    marginTop: 2,
  },
  limit: {
    fontSize: Type.caption,
    color: Palette.inkSecondary,
    marginTop: 2,
    marginBottom: Space.lg,
  },
  options: {
    flexDirection: 'row',
    gap: Space.md,
    marginBottom: Space.xl,
  },
  option: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Palette.border,
    padding: Space.lg,
    backgroundColor: Palette.cardMuted,
  },
  optionSelected: {
    borderColor: Palette.indigo,
    backgroundColor: Palette.indigoSoft,
  },
  optionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Space.sm,
  },
  optionMonths: {
    fontSize: Type.body,
    fontWeight: '700',
    color: Palette.ink,
  },
  featuredTag: {
    backgroundColor: Palette.green,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.sm,
    paddingVertical: 2,
  },
  featuredText: {
    color: Palette.onColor,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  optionPerMonth: {
    fontSize: Type.heading,
    fontWeight: '800',
    color: Palette.indigoInk,
  },
  optionPerMonthUnit: {
    fontSize: Type.bodySmall,
    fontWeight: '600',
  },
  optionApr: {
    fontSize: Type.caption,
    color: Palette.inkSecondary,
    marginTop: 2,
  },
  kfs: {
    fontSize: Type.caption,
    color: Palette.inkMuted,
    textAlign: 'center',
    marginTop: Space.md,
  },
});
