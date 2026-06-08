import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Button, FlatList, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

import { TABLET_H_PADDING, useResponsive } from '@/hooks/use-responsive';
import { BasketStore } from '@/services/basket-store';
import { TransactionStore } from '@/services/transaction-store';
import type { BasketItem } from '@/types/basket';

// Random UUID-shaped string for the simulated QR — deliberately NOT a real
// payment URI in this phase.
const generateSimulatedQrValue = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.floor(Math.random() * 16);
    const v = c === 'x' ? r : (r % 4) + 8;
    return v.toString(16);
  });

export default function CheckoutScreen() {
  const router = useRouter();
  const { isTablet } = useResponsive();
  const [items, setItems] = useState<BasketItem[]>([]);
  const [total, setTotal] = useState(0);
  const [qrValue] = useState(generateSimulatedQrValue);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBasket = useCallback(async () => {
    setLoading(true);
    try {
      const [basketItems, basketTotal] = await Promise.all([
        BasketStore.getBasketItems(),
        BasketStore.getBasketTotal(),
      ]);
      setItems(basketItems);
      setTotal(basketTotal);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load basket.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Runs on mount and every time the tab regains focus.
  useFocusEffect(
    useCallback(() => {
      void loadBasket();
    }, [loadBasket])
  );

  const handleSimulateScan = async () => {
    setProcessing(true);
    setError(null);
    try {
      const transactionId = await TransactionStore.logTransaction({
        total_amount: total,
        payment_method: 'SIMULATED_QR',
        basket_snapshot: JSON.stringify(items),
        item_count: items.reduce((sum, item) => sum + item.quantity, 0),
      });
      await BasketStore.clearBasket();
      router.replace({
        pathname: '/confirmation',
        params: {
          transaction_id: transactionId,
          total_amount: String(total),
          timestamp: new Date().toISOString(),
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Payment simulation failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading basket…</Text>
      </View>
    );
  }

  const list = (
    <FlatList
      style={isTablet ? styles.listColumnTablet : undefined}
      data={items}
      keyExtractor={(item) => item.basket_id}
      ListEmptyComponent={<Text>Basket is empty.</Text>}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.itemName}>
            {item.sku_name} × {item.quantity}
          </Text>
          <Text>₹{item.subtotal.toFixed(2)}</Text>
        </View>
      )}
    />
  );

  const summary = (
    <>
      <Text style={styles.total}>Total: ₹{total.toFixed(2)}</Text>

      <View style={styles.qrContainer}>
        <QRCode value={qrValue} size={isTablet ? 280 : 200} />
        <Text style={styles.qrCaption}>Scan to pay (simulated)</Text>
      </View>

      <Button
        title={processing ? 'Processing…' : 'Simulate Scan'}
        onPress={handleSimulateScan}
        disabled={processing || items.length === 0}
      />
    </>
  );

  return (
    <View style={[styles.container, isTablet && styles.containerTablet]}>
      <Text style={styles.title}>Checkout</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {isTablet ? (
        // Tablet: basket list on the left, total + QR + action on the right.
        <View style={styles.bodyTablet}>
          {list}
          <View style={styles.summaryColumnTablet}>{summary}</View>
        </View>
      ) : (
        <>
          {list}
          {summary}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  containerTablet: {
    paddingHorizontal: TABLET_H_PADDING,
  },
  bodyTablet: {
    flex: 1,
    flexDirection: 'row',
    gap: 24,
  },
  listColumnTablet: {
    flex: 1,
  },
  summaryColumnTablet: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  itemName: {
    flex: 1,
  },
  total: {
    fontSize: 18,
    fontWeight: '600',
  },
  qrContainer: {
    alignItems: 'center',
    gap: 8,
  },
  qrCaption: {
    fontSize: 12,
    color: '#666',
  },
  error: {
    color: 'red',
  },
});
