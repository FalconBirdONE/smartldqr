import { CameraView, useCameraPermissions } from 'expo-camera';
import { type Href, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { cardShadow, Palette, Radius, Space, Type } from '@/constants/design';
import { useResponsive } from '@/hooks/use-responsive';
import type { CheckoutLine } from '@/types/checkout';

/**
 * SelfCheckoutScreen — a camera-led self-checkout simulation.
 *
 * Left: a live `expo-camera` preview with a pulsing scan reticle (the scan
 * itself is simulated by the "Scan Item" button, which flashes the reticle).
 * Right: the running basket; "Confirm Checkout" hands the basket + total to the
 * unified checkout. Self-contained — the catalog is the shared MOCK_SKUS.
 *
 * Layout: 60 / 40 two-column on the landscape tablet, stacked on phone.
 */

const MOCK_SKUS = [
  { sku_id: 'SKU_001', name: 'Masala Chai', price: 20 },
  { sku_id: 'SKU_002', name: 'Samosa (2pc)', price: 30 },
  { sku_id: 'SKU_003', name: 'Vada Pav', price: 25 },
  { sku_id: 'SKU_004', name: 'Cold Coffee', price: 60 },
  { sku_id: 'SKU_005', name: 'Butter Toast', price: 35 },
] as const;

type Sku = (typeof MOCK_SKUS)[number];

type BillLine = {
  sku_id: string;
  name: string;
  price: number;
  qty: number;
};

export default function SelfCheckoutScreen() {
  const router = useRouter();
  const { isTablet } = useResponsive();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();

  const [lines, setLines] = useState<BillLine[]>([]);
  const total = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  const itemCount = lines.reduce((n, l) => n + l.qty, 0);
  const isEmpty = lines.length === 0;

  // Request camera access once on mount; the "Allow camera" prompt covers a
  // denied/again-asked state.
  const requested = useRef(false);
  useEffect(() => {
    if (permission && !permission.granted && !requested.current) {
      requested.current = true;
      void requestPermission();
    }
  }, [permission, requestPermission]);

  // ── Reticle animations ────────────────────────────────────────────────────
  const [pulse] = useState(() => new Animated.Value(0));
  const [flash] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  // Brief green flash over the reticle to fake a successful read.
  const flashReticle = useCallback(() => {
    flash.setValue(0);
    Animated.sequence([
      Animated.timing(flash, { toValue: 1, duration: 120, useNativeDriver: true }),
      Animated.timing(flash, {
        toValue: 0,
        duration: 380,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [flash]);

  // Simulate a scan: pick a random SKU, upsert by id, flash the reticle.
  const scanItem = useCallback(() => {
    const sku: Sku = MOCK_SKUS[Math.floor(Math.random() * MOCK_SKUS.length)];
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.sku_id === sku.sku_id);
      if (idx === -1) {
        return [...prev, { sku_id: sku.sku_id, name: sku.name, price: sku.price, qty: 1 }];
      }
      const next = [...prev];
      next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
      return next;
    });
    flashReticle();
  }, [flashReticle]);

  const checkoutLines = useMemo<CheckoutLine[]>(
    () =>
      lines.map((l) => ({
        id: l.sku_id,
        name: l.name,
        quantity: l.qty,
        unit_price: l.price,
        subtotal: l.price * l.qty,
      })),
    [lines]
  );

  const confirmCheckout = useCallback(() => {
    if (isEmpty) return;
    // Cast: new route; the typed-routes manifest picks it up on next regen.
    router.push({
      pathname: '/checkout-stub',
      params: { source: 'retail', total: String(total), basket: JSON.stringify(checkoutLines) },
    } as unknown as Href);
  }, [isEmpty, total, checkoutLines, router]);

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });

  /* --------------------------- LEFT: camera view ---------------------------- */
  const cameraPanel = (
    <View style={[styles.cameraPanel, isTablet ? styles.cameraPanelTablet : styles.cameraPanelPhone]}>
      {permission?.granted ? (
        <CameraView style={StyleSheet.absoluteFill} facing="back" />
      ) : (
        <View style={styles.permissionFill}>
          <Text style={styles.permissionTitle}>Camera access needed</Text>
          <Text style={styles.permissionSub}>
            Used only to preview the scanning lane — nothing is recorded.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.permissionBtn, pressed && styles.pressed]}
            onPress={() => void requestPermission()}
          >
            <Text style={styles.permissionBtnText}>Allow camera</Text>
          </Pressable>
        </View>
      )}

      {/* Running item-count badge, top-left. */}
      <View style={[styles.badge, { top: insets.top + Space.lg, left: insets.left + Space.lg }]}>
        <Text style={styles.badgeText}>
          {itemCount} item{itemCount === 1 ? '' : 's'} in basket
        </Text>
      </View>

      {/* Scan reticle + label. */}
      <View pointerEvents="none" style={styles.reticleWrap}>
        <Text style={styles.scanLabel}>Point camera at item to scan</Text>
        <View style={styles.reticleBox}>
          <Animated.View
            style={[styles.reticleRing, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]}
          />
          <Animated.View style={[styles.reticleFlash, { opacity: flash }]} />
        </View>
      </View>
    </View>
  );

  /* ----------------------------- RIGHT: basket ------------------------------ */
  const basketPanel = (
    <View
      style={[
        styles.basketPanel,
        {
          paddingTop: insets.top + Space.xl,
          paddingRight: insets.right + Space.xl,
          paddingBottom: insets.bottom + Space.xl,
        },
      ]}
    >
      <Text style={styles.basketTitle}>Basket</Text>

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {isEmpty ? (
          <Text style={styles.empty}>Tap “Scan Item” to add to your basket.</Text>
        ) : (
          lines.map((l) => (
            <View key={l.sku_id} style={styles.row}>
              <Text style={styles.rowName} numberOfLines={1}>
                {l.name}
              </Text>
              <Text style={styles.rowQty}>×{l.qty}</Text>
              <Text style={styles.rowTotal}>₹{(l.price * l.qty).toLocaleString('en-IN')}</Text>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.totalRow}>
          <View>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>₹{total.toLocaleString('en-IN')}</Text>
          </View>
          <Pressable
            onPress={scanItem}
            style={({ pressed }) => [styles.scanBtn, pressed && styles.pressed]}
          >
            <Text style={styles.scanBtnText}>Scan Item</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={confirmCheckout}
          disabled={isEmpty}
          style={({ pressed }) => [
            styles.confirmBtn,
            isEmpty && styles.btnDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.confirmBtnText, isEmpty && styles.confirmBtnTextDisabled]}>
            Confirm Checkout
          </Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={[styles.screen, isTablet ? styles.screenRow : styles.screenColumn]}>
      {cameraPanel}
      {basketPanel}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.canvas },
  screenRow: { flexDirection: 'row' },
  screenColumn: { flexDirection: 'column' },

  /* Camera */
  cameraPanel: { backgroundColor: Palette.ink, overflow: 'hidden' },
  cameraPanelTablet: { flex: 60 },
  cameraPanelPhone: { height: 320 },
  permissionFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.md,
    padding: Space.xxl,
  },
  permissionTitle: { color: Palette.onColor, fontSize: Type.heading, fontWeight: '700' },
  permissionSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: Type.bodySmall,
    textAlign: 'center',
    marginBottom: Space.sm,
  },
  permissionBtn: {
    backgroundColor: Palette.teal,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.xxl,
    paddingVertical: Space.md,
  },
  permissionBtnText: { color: Palette.onColor, fontSize: Type.body, fontWeight: '700' },

  badge: {
    position: 'absolute',
    backgroundColor: 'rgba(15,23,42,0.72)',
    borderRadius: Radius.pill,
    paddingHorizontal: Space.lg,
    paddingVertical: Space.sm,
  },
  badgeText: { color: Palette.onColor, fontSize: Type.bodySmall, fontWeight: '700' },

  reticleWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.xl,
  },
  scanLabel: {
    color: Palette.onColor,
    fontSize: Type.body,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 6,
  },
  reticleBox: { width: 240, height: 240, maxWidth: '70%' },
  reticleRing: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
    borderRadius: Radius.lg,
  },
  reticleFlash: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 3,
    borderColor: '#34D399',
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(52, 211, 153, 0.28)',
  },

  /* Basket */
  basketPanel: { flex: 40, backgroundColor: Palette.canvas, padding: Space.xl, gap: Space.lg },
  basketTitle: { fontSize: Type.title, fontWeight: '800', color: Palette.ink },

  list: { flex: 1 },
  empty: { color: Palette.inkMuted, fontSize: Type.body, paddingVertical: Space.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    backgroundColor: Palette.card,
    borderRadius: Radius.md,
    padding: Space.lg,
    marginBottom: Space.md,
    ...cardShadow,
  },
  rowName: { flex: 1, fontSize: Type.body, fontWeight: '700', color: Palette.ink },
  rowQty: { width: 48, textAlign: 'center', fontSize: Type.body, color: Palette.inkSecondary },
  rowTotal: { minWidth: 80, textAlign: 'right', fontSize: Type.body, fontWeight: '700', color: Palette.ink },

  footer: { gap: Space.lg },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingTop: Space.lg,
    borderTopWidth: 2,
    borderTopColor: Palette.borderStrong,
  },
  totalLabel: { fontSize: Type.caption, color: Palette.inkMuted },
  totalValue: { fontSize: Type.amount, fontWeight: '800', color: Palette.ink, letterSpacing: -1 },
  scanBtn: {
    backgroundColor: Palette.teal,
    borderRadius: Radius.md,
    paddingHorizontal: Space.xl,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanBtnText: { color: Palette.onColor, fontSize: Type.body, fontWeight: '800' },
  confirmBtn: {
    backgroundColor: Palette.amber,
    borderRadius: Radius.md,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: { color: '#3B2400', fontSize: Type.body, fontWeight: '800' },
  confirmBtnTextDisabled: { color: Palette.inkMuted },
  btnDisabled: { backgroundColor: Palette.cardMuted, opacity: 0.6 },
  pressed: { opacity: 0.85 },
});
