import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Eyebrow } from '@/components/ldqr/eyebrow';
import { PrimaryButton } from '@/components/ldqr/primary-button';
import { cardShadow, Palette, Radius, SCREEN_GUTTER, Space, Type } from '@/constants/design';
import { useBasket } from '@/context/basket';
import { useResponsive } from '@/hooks/use-responsive';
import { SkuStore } from '@/services/sku-store';
import type { SkuItem } from '@/types/sku';

function Field({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholderTextColor={Palette.inkMuted}
        {...props}
      />
    </View>
  );
}

export default function CatalogScreen() {
  const { isTablet } = useResponsive();
  const { addItem } = useBasket();
  const [skus, setSkus] = useState<SkuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<string | null>(null);

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

  useFocusEffect(
    useCallback(() => {
      void loadSkus();
    }, [loadSkus])
  );

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
      await addItem(item);
      setAdded(item.sku_id);
      setTimeout(() => setAdded((cur) => (cur === item.sku_id ? null : cur)), 1200);
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
        <ActivityIndicator size="large" color={Palette.indigo} />
        <Text style={styles.muted}>Loading catalog…</Text>
      </View>
    );
  }

  const form = (
    <View style={[styles.card, styles.formCard, isTablet && styles.formColumnTablet]}>
      <Eyebrow color={Palette.teal}>Inventory</Eyebrow>
      <Text style={styles.cardTitle}>Add a product</Text>
      <Field label="Name" placeholder="e.g. Trail running shoes" value={newName} onChangeText={setNewName} />
      <Field label="Base name (optional)" placeholder="Internal name" value={newBaseName} onChangeText={setNewBaseName} />
      <Field label="Price (₹)" placeholder="0" value={newPrice} onChangeText={setNewPrice} keyboardType="numeric" />
      <Field label="Category" placeholder="e.g. Footwear" value={newCategory} onChangeText={setNewCategory} />
      <Field label="Stock count" placeholder="0" value={newStockCount} onChangeText={setNewStockCount} keyboardType="numeric" />
      <PrimaryButton label="Add product" variant="teal" size="md" onPress={() => void handleAdd()} />
    </View>
  );

  const productCard = (item: SkuItem) => {
    if (editingSkuId === item.sku_id) {
      return (
        <View key={item.sku_id} style={[styles.card, styles.productCard, isTablet && styles.productCardTablet]}>
          <Field label="Name" value={editName} onChangeText={setEditName} />
          <Field label="Price (₹)" value={editPrice} onChangeText={setEditPrice} keyboardType="numeric" />
          <Field label="Category" value={editCategory} onChangeText={setEditCategory} />
          <Field label="Stock" value={editStockCount} onChangeText={setEditStockCount} keyboardType="numeric" />
          <View style={styles.actionRow}>
            <PrimaryButton label="Save" variant="indigo" size="md" style={styles.flexBtn} onPress={() => void handleSaveEdit(item)} />
            <Pressable style={styles.ghostBtn} onPress={() => setEditingSkuId(null)}>
              <Text style={styles.ghostBtnText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      );
    }
    return (
      <View key={item.sku_id} style={[styles.card, styles.productCard, isTablet && styles.productCardTablet]}>
        <View style={styles.productTop}>
          <Text style={styles.productName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.productPrice}>₹{item.price.toLocaleString('en-IN')}</Text>
        </View>
        <View style={styles.metaRow}>
          <View style={styles.categoryChip}>
            <Text style={styles.categoryChipText}>{item.category}</Text>
          </View>
          <Text style={styles.stock}>Stock {item.stock_count ?? 0}</Text>
        </View>
        <View style={styles.actionRow}>
          <PrimaryButton
            label={added === item.sku_id ? 'Added ✓' : 'Add to basket'}
            variant={added === item.sku_id ? 'dark' : 'amber'}
            size="md"
            style={styles.flexBtn}
            onPress={() => void handleAddToBasket(item)}
          />
          <Pressable style={styles.ghostBtn} onPress={() => startEdit(item)}>
            <Text style={styles.ghostBtnText}>Edit</Text>
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={() => void handleDelete(item.sku_id)}>
            <Text style={styles.iconBtnText}>🗑</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  const list = (
    <View style={isTablet ? styles.listColumnTablet : undefined}>
      {skus.length === 0 ? (
        <View style={[styles.card, styles.emptyCard]}>
          <Text style={styles.emptyText}>No products yet. Add one to start scanning.</Text>
        </View>
      ) : (
        <View style={styles.grid}>{skus.map(productCard)}</View>
      )}
    </View>
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Eyebrow>U2 · Self-checkout</Eyebrow>
        <Text style={styles.title}>Catalog</Text>
        <Text style={styles.subtitle}>Manage inventory and add items to the basket.</Text>
      </View>

      {error ? (
        <View style={styles.errorRow}>
          <Text style={styles.error}>{error}</Text>
          <Pressable onPress={() => void loadSkus()}>
            <Text style={styles.retry}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {isTablet ? (
        <View style={styles.bodyTablet}>
          {form}
          {list}
        </View>
      ) : (
        <>
          {form}
          {list}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.canvas },
  scrollContent: {
    padding: SCREEN_GUTTER,
    gap: Space.xl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.md,
    backgroundColor: Palette.canvas,
  },
  muted: { color: Palette.inkSecondary },
  header: { gap: 2 },
  title: { fontSize: Type.title, fontWeight: '800', color: Palette.ink },
  subtitle: { fontSize: Type.bodySmall, color: Palette.inkSecondary },
  bodyTablet: {
    flexDirection: 'row',
    gap: Space.xl,
    alignItems: 'flex-start',
  },
  card: {
    backgroundColor: Palette.card,
    borderRadius: Radius.lg,
    padding: Space.xl,
    ...cardShadow,
  },
  formCard: { gap: Space.md },
  formColumnTablet: { flex: 1, maxWidth: 360 },
  listColumnTablet: { flex: 2 },
  cardTitle: {
    fontSize: Type.heading,
    fontWeight: '700',
    color: Palette.ink,
    marginBottom: Space.xs,
  },
  field: { gap: 4 },
  fieldLabel: {
    fontSize: Type.caption,
    color: Palette.inkSecondary,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1.5,
    borderColor: Palette.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Space.md,
    paddingVertical: Space.md,
    fontSize: Type.body,
    color: Palette.ink,
    backgroundColor: Palette.cardMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Space.lg,
  },
  productCard: { gap: Space.md },
  productCardTablet: {
    flexGrow: 1,
    flexBasis: 280,
    maxWidth: '100%',
  },
  productTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productName: {
    flex: 1,
    fontSize: Type.body,
    fontWeight: '700',
    color: Palette.ink,
  },
  productPrice: {
    fontSize: Type.heading,
    fontWeight: '800',
    color: Palette.ink,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
  },
  categoryChip: {
    backgroundColor: Palette.indigoSoft,
    borderRadius: Radius.pill,
    paddingHorizontal: Space.md,
    paddingVertical: 4,
  },
  categoryChipText: {
    fontSize: Type.micro,
    fontWeight: '700',
    color: Palette.indigoInk,
  },
  stock: {
    fontSize: Type.caption,
    color: Palette.inkMuted,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.sm,
  },
  flexBtn: { flex: 1 },
  ghostBtn: {
    paddingHorizontal: Space.lg,
    paddingVertical: Space.md,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Palette.borderStrong,
  },
  ghostBtnText: {
    fontSize: Type.bodySmall,
    fontWeight: '600',
    color: Palette.inkSecondary,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.cardMuted,
  },
  iconBtnText: { fontSize: Type.body },
  emptyCard: { alignItems: 'center' },
  emptyText: { color: Palette.inkMuted, fontSize: Type.body },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Palette.dangerSoft,
    borderRadius: Radius.sm,
    padding: Space.md,
  },
  error: { color: Palette.danger, flex: 1, fontSize: Type.bodySmall },
  retry: { color: Palette.danger, fontWeight: '700' },
});
