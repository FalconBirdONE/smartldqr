import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { TABLET_H_PADDING, useResponsive } from '@/hooks/use-responsive';
import { BasketStore } from '@/services/basket-store';
import { SkuStore } from '@/services/sku-store';
import type { SkuItem } from '@/types/sku';

export default function CatalogScreen() {
  const { isTablet } = useResponsive();
  const [skus, setSkus] = useState<SkuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add form
  const [newName, setNewName] = useState('');
  const [newBaseName, setNewBaseName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newStockCount, setNewStockCount] = useState('');

  // Inline edit
  const [editingSkuId, setEditingSkuId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editStockCount, setEditStockCount] = useState('');

  const loadSkus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSkus(await SkuStore.getAllActiveSkus());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load catalog.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSkus();
  }, [loadSkus]);

  const handleAdd = async () => {
    const price = Number(newPrice);
    if (!newName.trim() || !newCategory.trim() || newPrice.trim() === '' || !Number.isFinite(price)) {
      setError('Name, category and a numeric price are required.');
      return;
    }
    setError(null);
    try {
      await SkuStore.insertSku({
        name: newName.trim(),
        base_name: newBaseName.trim() || newName.trim(),
        price,
        category: newCategory.trim(),
        stock_count: Number.parseInt(newStockCount, 10) || 0,
      });
      setNewName('');
      setNewBaseName('');
      setNewPrice('');
      setNewCategory('');
      setNewStockCount('');
      await loadSkus();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add SKU.');
    }
  };

  const handleDelete = async (skuId: string) => {
    setError(null);
    try {
      await SkuStore.deleteSku(skuId);
      await loadSkus();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete SKU.');
    }
  };

  const startEdit = (item: SkuItem) => {
    setEditingSkuId(item.sku_id);
    setEditName(item.name);
    setEditPrice(String(item.price));
    setEditCategory(item.category);
    setEditStockCount(String(item.stock_count ?? 0));
  };

  const handleAddToBasket = async (item: SkuItem) => {
    setError(null);
    try {
      await BasketStore.addItem(item);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add to basket.');
    }
  };

  const handleSaveEdit = async (item: SkuItem) => {
    const price = Number(editPrice);
    if (!editName.trim() || !editCategory.trim() || editPrice.trim() === '' || !Number.isFinite(price)) {
      setError('Name, category and a numeric price are required.');
      return;
    }
    setError(null);
    try {
      await SkuStore.updateSku({
        ...item,
        name: editName.trim(),
        price,
        category: editCategory.trim(),
        stock_count: Number.parseInt(editStockCount, 10) || 0,
      });
      setEditingSkuId(null);
      await loadSkus();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update SKU.');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text>Loading catalog…</Text>
      </View>
    );
  }

  const formContent = (
    <View style={[styles.addForm, isTablet && styles.formColumnTablet]}>
      <TextInput style={styles.input} placeholder="Name" value={newName} onChangeText={setNewName} />
      <TextInput
        style={styles.input}
        placeholder="Base name"
        value={newBaseName}
        onChangeText={setNewBaseName}
      />
      <TextInput
        style={styles.input}
        placeholder="Price"
        value={newPrice}
        onChangeText={setNewPrice}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Category"
        value={newCategory}
        onChangeText={setNewCategory}
      />
      <TextInput
        style={styles.input}
        placeholder="Stock count"
        value={newStockCount}
        onChangeText={setNewStockCount}
        keyboardType="numeric"
      />
      <Button title="Add SKU" onPress={handleAdd} />
    </View>
  );

  const listElement = (
    <FlatList
      style={isTablet ? styles.listColumnTablet : undefined}
      data={skus}
      keyExtractor={(item) => item.sku_id}
      ListEmptyComponent={<Text style={styles.empty}>No SKUs yet. Add one above.</Text>}
      renderItem={({ item }) =>
        editingSkuId === item.sku_id ? (
          <View style={styles.row}>
            <TextInput style={styles.input} value={editName} onChangeText={setEditName} />
            <TextInput
              style={styles.input}
              value={editPrice}
              onChangeText={setEditPrice}
              keyboardType="numeric"
            />
            <TextInput style={styles.input} value={editCategory} onChangeText={setEditCategory} />
            <TextInput
              style={styles.input}
              value={editStockCount}
              onChangeText={setEditStockCount}
              keyboardType="numeric"
            />
            <Button title="Save" onPress={() => void handleSaveEdit(item)} />
            <Button title="Cancel" onPress={() => setEditingSkuId(null)} />
          </View>
        ) : (
          <View style={styles.row}>
            <Text style={styles.itemText}>
              {item.name} — ₹{item.price} — {item.category} — stock: {item.stock_count ?? 0}
            </Text>
            <Button title="Add" onPress={() => void handleAddToBasket(item)} />
            <Button title="Edit" onPress={() => startEdit(item)} />
            <Button title="Delete" onPress={() => void handleDelete(item.sku_id)} />
          </View>
        )
      }
    />
  );

  return (
    <View style={[styles.container, isTablet && styles.containerTablet]}>
      <Text style={styles.title}>Catalog</Text>

      {error ? (
        <View style={styles.errorRow}>
          <Text style={styles.error}>{error}</Text>
          <Button title="Retry" onPress={() => void loadSkus()} />
        </View>
      ) : null}

      {isTablet ? (
        // Tablet: form on the left, SKU list alongside it on the right.
        <View style={styles.bodyTablet}>
          {formContent}
          {listElement}
        </View>
      ) : (
        // Phone: unchanged — form stacked above the list.
        <>
          {formContent}
          {listElement}
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
  formColumnTablet: {
    flex: 1,
  },
  listColumnTablet: {
    flex: 2,
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
  addForm: {
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexShrink: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  itemText: {
    flex: 1,
  },
  empty: {
    paddingVertical: 16,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  error: {
    color: 'red',
    flex: 1,
  },
});
