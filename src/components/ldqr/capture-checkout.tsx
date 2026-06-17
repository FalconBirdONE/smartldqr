import { CameraView } from 'expo-camera';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { PrimaryButton } from '@/components/ldqr/primary-button';
import { TrustChip } from '@/components/ldqr/trust-chip';
import { cardShadow, Palette, Radius, Space, Type } from '@/constants/design';
import { useBasket } from '@/context/basket';
import { useBarcodeScanner } from '@/hooks/use-barcode-scanner';
import { useResponsive } from '@/hooks/use-responsive';
import { SkuStore } from '@/services/sku-store';
import type { CheckoutLine } from '@/types/checkout';

/** Width reserved so pane headers clear the floating Settings gear. */
const SETTINGS_CLEARANCE = 60;

const SCAN_BARCODE_TYPES = [
  'qr',
  'ean13',
  'ean8',
  'upc_a',
  'upc_e',
  'code128',
  'code39',
] as const;

type Feedback = { tone: 'ok' | 'warn'; text: string };

/**
 * The shared capture-checkout surface used by every retail module (U1
 * cashier-led, U2 self-checkout). Quadrant layout on tablet landscape:
 * camera + scan HUD on the left, the live basket with inline qty edit /
 * delete on the right, Cancel top-right (beside the global Settings gear),
 * Confirm bottom-right. Phones stack the same panes vertically.
 *
 * Scans resolve against the SKU catalog and append straight to the global
 * basket store — no staging list.
 */
export function CaptureCheckout() {
  const router = useRouter();
  const { isTablet } = useResponsive();
  const { items, total, itemCount, addItem, updateQuantity, removeItem } = useBasket();

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (feedbackTimer.current) {
        clearTimeout(feedbackTimer.current);
      }
    };
  }, []);

  const flash = useCallback((next: Feedback) => {
    if (feedbackTimer.current) {
      clearTimeout(feedbackTimer.current);
    }
    setFeedback(next);
    feedbackTimer.current = setTimeout(() => setFeedback(null), 1800);
  }, []);

  // Valid scan → resolve the SKU from the catalog → append to the basket.
  const handleCode = useCallback(
    async (data: string) => {
      try {
        let sku = await SkuStore.getSkuById(data.trim());
        if (!sku) {
          // Fallback: codes that carry the product name instead of the id.
          const all = await SkuStore.getAllActiveSkus();
          sku = all.find((s) => s.name.toLowerCase() === data.trim().toLowerCase()) ?? null;
        }
        if (!sku) {
          flash({ tone: 'warn', text: 'Code not in catalog' });
          return;
        }
        await addItem(sku);
        flash({ tone: 'ok', text: `Added ${sku.name}` });
      } catch (e) {
        flash({ tone: 'warn', text: e instanceof Error ? e.message : 'Scan failed — try again.' });
      }
    },
    [addItem, flash]
  );

  const { permission, requestPermission, onBarcodeScanned, busy } = useBarcodeScanner(handleCode);

  const handleCancel = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  }, [router]);

  const handleConfirm = useCallback(() => {
    const lines: CheckoutLine[] = items.map((it) => ({
      id: it.basket_id,
      name: it.sku_name,
      quantity: it.quantity,
      unit_price: it.price,
      subtotal: it.subtotal,
    }));
    // Cast: new route; the typed-routes manifest picks it up on next regen.
    router.push({
      pathname: '/checkout-stub',
      params: { source: 'retail', total: String(total), basket: JSON.stringify(lines) },
    } as unknown as Href);
  }, [items, total, router]);

  const cameraPane = (
    <View style={[styles.cameraPane, isTablet && styles.cameraPaneTablet]}>
      {permission?.granted ? (
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: [...SCAN_BARCODE_TYPES] }}
          onBarcodeScanned={busy ? undefined : onBarcodeScanned}
        />
      ) : (
        <View style={styles.permissionFill}>
          <Text style={styles.permissionTitle}>Camera access needed</Text>
          <Text style={styles.permissionSub}>
            The camera only reads product codes — nothing is recorded.
          </Text>
          <PrimaryButton
            label="Allow camera"
            variant="teal"
            size="md"
            onPress={() => void requestPermission()}
          />
        </View>
      )}

      {/* Scan HUD */}
      <View pointerEvents="none" style={styles.hud}>
        <View style={styles.hudFrame} />
        <View
          style={[
            styles.hudChip,
            feedback?.tone === 'ok' && styles.hudChipOk,
            feedback?.tone === 'warn' && styles.hudChipWarn,
          ]}
        >
          <Text style={styles.hudChipText}>
            {feedback ? feedback.text : busy ? 'Reading…' : 'Point a product code at the camera'}
          </Text>
        </View>
      </View>

      <View style={styles.privacyChip}>
        <TrustChip label="Camera private · codes only" tone="light" icon="🎥" />
      </View>
    </View>
  );

  const basketPane = (
    <View style={styles.basketPane}>
      <View style={styles.basketHeader}>
        <View>
          <Text style={styles.basketTitle}>Basket</Text>
          <Text style={styles.basketSub}>
            {itemCount} item{itemCount === 1 ? '' : 's'}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          style={styles.cancelBtn}
          onPress={handleCancel}
        >
          <Text style={styles.cancelText}>Cancel checkout</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.basketList} showsVerticalScrollIndicator={false}>
        {items.length === 0 ? (
          <Text style={styles.empty}>Scan a product to start the bill.</Text>
        ) : (
          items.map((it) => (
            <View key={it.basket_id} style={styles.row}>
              <View style={styles.rowInfo}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {it.sku_name}
                </Text>
                <Text style={styles.rowUnit}>₹{it.price.toLocaleString('en-IN')} each</Text>
              </View>
              <View style={styles.stepper}>
                <Pressable
                  accessibilityLabel={`Decrease ${it.sku_name}`}
                  style={styles.stepBtn}
                  onPress={() => void updateQuantity(it.basket_id, it.quantity - 1)}
                >
                  <Text style={styles.stepText}>−</Text>
                </Pressable>
                <Text style={styles.qty}>{it.quantity}</Text>
                <Pressable
                  accessibilityLabel={`Increase ${it.sku_name}`}
                  style={styles.stepBtn}
                  onPress={() => void updateQuantity(it.basket_id, it.quantity + 1)}
                >
                  <Text style={styles.stepText}>+</Text>
                </Pressable>
              </View>
              <Text style={styles.rowSubtotal}>₹{it.subtotal.toLocaleString('en-IN')}</Text>
              <Pressable
                accessibilityLabel={`Remove ${it.sku_name}`}
                style={styles.deleteBtn}
                onPress={() => void removeItem(it.basket_id)}
              >
                <Text style={styles.deleteText}>🗑</Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.confirmBar}>
        <View>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>₹{total.toLocaleString('en-IN')}</Text>
        </View>
        <PrimaryButton
          label="Confirm checkout"
          subLabel="Choose how to pay"
          variant="amber"
          disabled={items.length === 0}
          onPress={handleConfirm}
          style={styles.confirmBtn}
        />
      </View>
    </View>
  );

  return (
    <View style={[styles.screen, isTablet && styles.screenTablet]}>
      {cameraPane}
      {basketPane}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.canvas },
  screenTablet: { flexDirection: 'row' },

  cameraPane: {
    flex: 1,
    backgroundColor: Palette.ink,
    overflow: 'hidden',
  },
  cameraPaneTablet: { flex: 1.2 },
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
  hud: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.xl,
  },
  hudFrame: {
    width: '55%',
    aspectRatio: 1,
    maxHeight: '50%',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.85)',
    borderRadius: Radius.lg,
  },
  hudChip: {
    backgroundColor: 'rgba(15,23,42,0.75)',
    borderRadius: Radius.pill,
    paddingHorizontal: Space.xl,
    paddingVertical: Space.md,
  },
  hudChipOk: { backgroundColor: Palette.greenStrong },
  hudChipWarn: { backgroundColor: Palette.amberStrong },
  hudChipText: { color: Palette.onColor, fontSize: Type.bodySmall, fontWeight: '700' },
  privacyChip: {
    position: 'absolute',
    left: Space.lg,
    top: Space.lg,
  },

  basketPane: {
    flex: 1,
    padding: Space.xl,
    gap: Space.lg,
  },
  basketHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    // Leave room for the floating Settings gear in the screen's top-right.
    paddingRight: SETTINGS_CLEARANCE,
  },
  basketTitle: { fontSize: Type.title, fontWeight: '800', color: Palette.ink },
  basketSub: { fontSize: Type.caption, color: Palette.inkSecondary, marginTop: 2 },
  cancelBtn: {
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Palette.borderStrong,
  },
  cancelText: { fontSize: Type.bodySmall, fontWeight: '700', color: Palette.inkSecondary },

  basketList: { flex: 1 },
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
  rowInfo: { flex: 1 },
  rowName: { fontSize: Type.body, fontWeight: '700', color: Palette.ink },
  rowUnit: { fontSize: Type.caption, color: Palette.inkMuted, marginTop: 1 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.cardMuted,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  stepText: { fontSize: Type.heading, fontWeight: '700', color: Palette.ink, lineHeight: 22 },
  qty: {
    minWidth: 24,
    textAlign: 'center',
    fontSize: Type.body,
    fontWeight: '800',
    color: Palette.ink,
  },
  rowSubtotal: {
    minWidth: 72,
    textAlign: 'right',
    fontSize: Type.body,
    fontWeight: '700',
    color: Palette.ink,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.dangerSoft,
  },
  deleteText: { fontSize: Type.bodySmall },

  confirmBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Space.lg,
  },
  totalLabel: { fontSize: Type.caption, color: Palette.inkMuted },
  totalValue: {
    fontSize: Type.title,
    fontWeight: '800',
    color: Palette.ink,
    letterSpacing: -0.5,
  },
  confirmBtn: { flex: 1, maxWidth: 360 },
});
