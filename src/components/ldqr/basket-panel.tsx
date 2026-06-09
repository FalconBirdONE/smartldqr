import { useEffect, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Eyebrow } from '@/components/ldqr/eyebrow';
import { cardShadow, Palette, Radius, Space, Type } from '@/constants/design';

export type BasketLine = {
  id: string;
  name: string;
  quantity: number;
  subtotal: number;
  note?: string;
};

/** A single basket line that amber-flashes when freshly added. */
function Row({ line, flash }: { line: BasketLine; flash: boolean }) {
  const [bg] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!flash) return;
    bg.setValue(1);
    Animated.timing(bg, {
      toValue: 0,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [flash, bg]);

  const backgroundColor = bg.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(245,158,11,0)', Palette.amberSoft],
  });

  return (
    <Animated.View style={[styles.row, { backgroundColor }]}>
      <View style={styles.qtyBadge}>
        <Text style={styles.qtyText}>×{line.quantity}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.rowName} numberOfLines={1}>
          {line.name}
        </Text>
        {line.note ? <Text style={styles.rowNote}>{line.note}</Text> : null}
      </View>
      <Text style={styles.rowPrice}>₹{line.subtotal.toLocaleString('en-IN')}</Text>
    </Animated.View>
  );
}

/**
 * The right-hand itemised basket / bill panel. Line items, subtotal,
 * "GST included" reassurance, and a large Total. The most recently added line
 * (`flashId`) amber-flashes.
 */
export function BasketPanel({
  title = 'Your basket',
  eyebrow = 'Itemised bill',
  lines,
  total,
  flashId,
  footerSlot,
}: {
  title?: string;
  eyebrow?: string;
  lines: BasketLine[];
  total: number;
  flashId?: string | null;
  footerSlot?: React.ReactNode;
}) {
  const count = lines.reduce((n, l) => n + l.quantity, 0);
  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <Eyebrow>{eyebrow}</Eyebrow>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.count}>
          {count} item{count === 1 ? '' : 's'}
        </Text>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {lines.length === 0 ? (
          <Text style={styles.empty}>No items yet.</Text>
        ) : (
          lines.map((l) => <Row key={l.id} line={l} flash={flashId === l.id} />)
        )}
      </ScrollView>

      <View style={styles.totals}>
        <View style={styles.totalRow}>
          <Text style={styles.subLabel}>Subtotal</Text>
          <Text style={styles.subValue}>₹{total.toLocaleString('en-IN')}</Text>
        </View>
        <Text style={styles.gst}>GST included</Text>
        <View style={styles.divider} />
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>₹{total.toLocaleString('en-IN')}</Text>
        </View>
        {footerSlot}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    padding: Space.xl,
    ...cardShadow,
  },
  header: {
    marginBottom: Space.md,
  },
  title: {
    fontSize: Type.title,
    fontWeight: '700',
    color: Palette.ink,
    marginTop: 2,
  },
  count: {
    fontSize: Type.caption,
    color: Palette.inkMuted,
    marginTop: 2,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: Space.xs,
    paddingVertical: Space.xs,
  },
  empty: {
    color: Palette.inkMuted,
    fontSize: Type.body,
    paddingVertical: Space.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    paddingVertical: Space.md,
    paddingHorizontal: Space.sm,
    borderRadius: Radius.sm,
  },
  qtyBadge: {
    minWidth: 36,
    paddingHorizontal: Space.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    backgroundColor: Palette.cardMuted,
    alignItems: 'center',
  },
  qtyText: {
    fontSize: Type.caption,
    fontWeight: '700',
    color: Palette.inkSecondary,
  },
  rowBody: {
    flex: 1,
  },
  rowName: {
    fontSize: Type.body,
    color: Palette.ink,
    fontWeight: '600',
  },
  rowNote: {
    fontSize: Type.caption,
    color: Palette.inkMuted,
    marginTop: 1,
  },
  rowPrice: {
    fontSize: Type.body,
    color: Palette.ink,
    fontWeight: '700',
  },
  totals: {
    marginTop: Space.md,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  subLabel: {
    fontSize: Type.body,
    color: Palette.inkSecondary,
  },
  subValue: {
    fontSize: Type.body,
    color: Palette.inkSecondary,
    fontWeight: '600',
  },
  gst: {
    fontSize: Type.caption,
    color: Palette.inkMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Palette.border,
    marginVertical: Space.md,
  },
  totalLabel: {
    fontSize: Type.title,
    fontWeight: '700',
    color: Palette.ink,
  },
  totalValue: {
    fontSize: Type.amount,
    fontWeight: '800',
    color: Palette.ink,
    letterSpacing: -0.5,
  },
});
