import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Button, FlatList, NativeModules, StyleSheet, Text, View } from 'react-native';

import type { BasketItem } from '@/types/basket';

const { BasketModule } = NativeModules as {
  BasketModule: {
    getBasketItems(): Promise<string>;
  };
};

export default function HomeScreen() {
  const router = useRouter();
  const [items, setItems] = useState<BasketItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadBasket = useCallback(async () => {
    try {
      const json = await BasketModule.getBasketItems();
      setItems(JSON.parse(json) as BasketItem[]);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load basket.');
    }
  }, []);

  // Runs on mount and every time the tab regains focus.
  useFocusEffect(
    useCallback(() => {
      void loadBasket();
    }, [loadBasket])
  );

  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  if (items.length === 0) {
    return (
      <View style={styles.center}>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.emptyText}>No items in basket</Text>
        <Button title="Go to Catalog" onPress={() => router.push('/catalog')} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Text style={styles.title}>Current Basket</Text>
      <Text>
        {itemCount} item{itemCount === 1 ? '' : 's'} — total ₹{total.toFixed(2)}
      </Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.basket_id}
        renderItem={({ item }) => (
          <Text style={styles.itemText}>
            {item.sku_name} × {item.quantity}
          </Text>
        )}
      />
      <Button title="Proceed to Checkout" onPress={() => router.push('/checkout')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 16,
  },
  itemText: {
    paddingVertical: 4,
  },
  error: {
    color: 'red',
  },
});
