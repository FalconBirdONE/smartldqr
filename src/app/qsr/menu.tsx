import { useState } from 'react';
import { useRouter, type Href } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CustomiseSheet } from '@/components/ldqr/customise-sheet';
import { Eyebrow } from '@/components/ldqr/eyebrow';
import { PrimaryButton } from '@/components/ldqr/primary-button';
import { cardShadow, Palette, Radius, SCREEN_GUTTER, Space, Type } from '@/constants/design';
import { QSR_MENU, type MenuItem } from '@/constants/qsr-menu';
import { useBrand } from '@/context/brand';
import { lineNote, lineUnitPrice, useQsrOrder, type LineOptions } from '@/context/qsr-order';
import { useResponsive } from '@/hooks/use-responsive';

export default function QsrMenu() {
  const router = useRouter();
  const { brand } = useBrand();
  const { isTablet } = useResponsive();
  const order = useQsrOrder();

  const [catId, setCatId] = useState(QSR_MENU[0].id);
  const [sheetItem, setSheetItem] = useState<MenuItem | null>(null);

  const category = QSR_MENU.find((c) => c.id === catId) ?? QSR_MENU[0];

  const onAdd = (item: MenuItem) => {
    if (item.customisable) {
      setSheetItem(item);
    } else {
      order.addLine(item);
    }
  };

  const categoryRail = (
    <ScrollView
      horizontal={!isTablet}
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={isTablet ? styles.railColContent : styles.railRowContent}
      style={isTablet ? styles.railCol : undefined}
    >
      {QSR_MENU.map((c) => {
        const active = c.id === catId;
        return (
          <Pressable
            key={c.id}
            onPress={() => setCatId(c.id)}
            style={[styles.catBtn, active && styles.catBtnActive]}
          >
            <Text style={styles.catEmoji}>{c.emoji}</Text>
            <Text style={[styles.catLabel, active && styles.catLabelActive]}>{c.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  const grid = (
    <ScrollView style={styles.gridScroll} showsVerticalScrollIndicator={false}>
      <Eyebrow style={styles.gridEyebrow}>{category.label} · pick of the week</Eyebrow>
      <View style={styles.grid}>
        {category.items.map((item) => (
          <View key={item.id} style={[styles.itemCard, isTablet && styles.itemCardTablet]}>
            <Text style={styles.itemEmoji}>{item.emoji}</Text>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemDesc} numberOfLines={2}>{item.desc}</Text>
            <View style={styles.itemBottom}>
              <Text style={styles.itemPrice}>₹{item.price}</Text>
              <Pressable style={styles.addBtn} onPress={() => onAdd(item)}>
                <Text style={styles.addBtnText}>{item.customisable ? 'Customise' : 'Add +'}</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const basket = (
    <View style={[styles.basket, isTablet && styles.basketTablet]}>
      <Eyebrow>Your order</Eyebrow>
      <Text style={styles.basketTitle}>{order.itemCount} item{order.itemCount === 1 ? '' : 's'}</Text>

      <ScrollView style={styles.basketList} showsVerticalScrollIndicator={false}>
        {order.lines.length === 0 ? (
          <Text style={styles.basketEmpty}>Tap a dish to start your order.</Text>
        ) : (
          order.lines.map((l) => {
            const note = lineNote(l);
            return (
              <View key={l.lineId} style={styles.line}>
                <View style={styles.flex}>
                  <Text style={styles.lineName} numberOfLines={1}>{l.item.name}</Text>
                  {note ? <Text style={styles.lineNote}>{note}</Text> : null}
                  <Text style={styles.linePrice}>₹{lineUnitPrice(l) * l.qty}</Text>
                </View>
                <View style={styles.stepper}>
                  <Pressable style={styles.stepBtn} onPress={() => order.decLine(l.lineId)}>
                    <Text style={styles.stepText}>−</Text>
                  </Pressable>
                  <Text style={styles.qty}>{l.qty}</Text>
                  <Pressable style={styles.stepBtn} onPress={() => order.incLine(l.lineId)}>
                    <Text style={styles.stepText}>+</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={styles.basketFooter}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>₹{order.subtotal}</Text>
        </View>
        <PrimaryButton
          label="Review order"
          variant="amber"
          size="md"
          disabled={order.itemCount === 0}
          onPress={() => router.push('/qsr/review' as Href)}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace('/qsr' as Href)} hitSlop={12}>
          <Text style={styles.back}>‹ Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{brand.name} · Menu</Text>
        <View style={styles.headerSpacer} />
      </View>

      {isTablet ? (
        <View style={styles.bodyRow}>
          {categoryRail}
          <View style={styles.gridWrap}>{grid}</View>
          {basket}
        </View>
      ) : (
        <View style={styles.bodyCol}>
          {categoryRail}
          <View style={styles.gridWrapPhone}>{grid}</View>
          {basket}
        </View>
      )}

      <CustomiseSheet
        visible={sheetItem !== null}
        item={sheetItem}
        onClose={() => setSheetItem(null)}
        onAdd={(options: LineOptions) => {
          if (sheetItem) order.addLine(sheetItem, options);
          setSheetItem(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.canvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SCREEN_GUTTER,
    paddingTop: Space.lg,
    paddingBottom: Space.sm,
  },
  back: { fontSize: Type.body, fontWeight: '700', color: Palette.indigo, width: 80 },
  headerTitle: { fontSize: Type.heading, fontWeight: '800', color: Palette.ink },
  headerSpacer: { width: 80 },
  bodyRow: {
    flex: 1,
    flexDirection: 'row',
    padding: SCREEN_GUTTER,
    paddingTop: Space.md,
    gap: Space.lg,
  },
  bodyCol: {
    flex: 1,
    padding: Space.lg,
    gap: Space.md,
  },
  railCol: { width: 104, flexGrow: 0 },
  railColContent: { gap: Space.sm },
  railRowContent: { gap: Space.sm, paddingVertical: Space.xs },
  catBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Space.md,
    paddingHorizontal: Space.lg,
    borderRadius: Radius.md,
    backgroundColor: Palette.card,
    gap: 2,
    ...cardShadow,
  },
  catBtnActive: { backgroundColor: Palette.ink },
  catEmoji: { fontSize: Type.title },
  catLabel: { fontSize: Type.caption, fontWeight: '700', color: Palette.inkSecondary },
  catLabelActive: { color: Palette.onColor },
  gridWrap: { flex: 2 },
  gridWrapPhone: { flex: 1, minHeight: 240 },
  gridScroll: { flex: 1 },
  gridEyebrow: { marginBottom: Space.md },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.lg,
  },
  itemCard: {
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    padding: Space.lg,
    width: '100%',
    gap: 2,
    ...cardShadow,
  },
  itemCardTablet: {
    flexGrow: 1,
    flexBasis: 200,
    maxWidth: '48%',
  },
  itemEmoji: { fontSize: 36, marginBottom: Space.sm },
  itemName: { fontSize: Type.body, fontWeight: '700', color: Palette.ink },
  itemDesc: { fontSize: Type.caption, color: Palette.inkSecondary, marginTop: 2, minHeight: 32 },
  itemBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Space.sm,
  },
  itemPrice: { fontSize: Type.heading, fontWeight: '800', color: Palette.ink },
  addBtn: {
    backgroundColor: Palette.amberSoft,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
  },
  addBtnText: { fontSize: Type.bodySmall, fontWeight: '700', color: Palette.amberInk },
  basket: {
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    padding: Space.lg,
    ...cardShadow,
  },
  basketTablet: { flex: 1.1, maxWidth: 360 },
  basketTitle: { fontSize: Type.title, fontWeight: '700', color: Palette.ink, marginTop: 2 },
  basketList: { flexGrow: 0, maxHeight: 360, marginTop: Space.md },
  basketEmpty: { color: Palette.inkMuted, fontSize: Type.bodySmall, paddingVertical: Space.lg },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    paddingVertical: Space.md,
    borderBottomWidth: 1,
    borderBottomColor: Palette.border,
  },
  flex: { flex: 1 },
  lineName: { fontSize: Type.bodySmall, fontWeight: '700', color: Palette.ink },
  lineNote: { fontSize: Type.micro, color: Palette.inkMuted, marginTop: 1 },
  linePrice: { fontSize: Type.caption, color: Palette.inkSecondary, fontWeight: '600', marginTop: 2 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.cardMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepText: { fontSize: Type.heading, fontWeight: '700', color: Palette.ink },
  qty: { fontSize: Type.body, fontWeight: '700', color: Palette.ink, minWidth: 20, textAlign: 'center' },
  basketFooter: { marginTop: Space.md, gap: Space.md },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  totalLabel: { fontSize: Type.body, color: Palette.inkSecondary },
  totalValue: { fontSize: Type.title, fontWeight: '800', color: Palette.ink },
});
