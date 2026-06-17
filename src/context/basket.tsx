import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { BasketStore } from '@/services/basket-store';
import type { BasketItem } from '@/types/basket';
import type { SkuItem } from '@/types/sku';

/**
 * The single top-level owner of basket state. Screens read from here instead
 * of querying `BasketStore` locally, so the basket survives re-renders and
 * navigation. Every mutation writes through to SQLite (the basket's shape and
 * persistence are unchanged — only its ownership moved up).
 */
type BasketValue = {
  items: BasketItem[];
  total: number;
  itemCount: number;
  /** True once the first read from SQLite has settled. */
  hydrated: boolean;
  error: string | null;
  addItem: (sku: Partial<SkuItem>) => Promise<void>;
  /** Set a line's quantity; 0 removes the line. */
  updateQuantity: (basketId: string, quantity: number) => Promise<void>;
  removeItem: (basketId: string) => Promise<void>;
  clearBasket: () => Promise<void>;
  refresh: () => Promise<void>;
};

const BasketContext = createContext<BasketValue | null>(null);

export function BasketProvider({ children }: PropsWithChildren) {
  const [items, setItems] = useState<BasketItem[]>([]);
  const [total, setTotal] = useState(0);
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [nextItems, nextTotal] = await Promise.all([
        BasketStore.getBasketItems(),
        BasketStore.getBasketTotal(),
      ]);
      setItems(nextItems);
      setTotal(nextTotal);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load basket.');
    } finally {
      setHydrated(true);
    }
  }, []);

  // Hydrate once from SQLite so "Resume your basket" survives app restarts.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [nextItems, nextTotal] = await Promise.all([
          BasketStore.getBasketItems(),
          BasketStore.getBasketTotal(),
        ]);
        if (!cancelled) {
          setItems(nextItems);
          setTotal(nextTotal);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load basket.');
        }
      } finally {
        if (!cancelled) {
          setHydrated(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Mutations rethrow so callers keep their existing error handling.
  const addItem = useCallback(
    async (sku: Partial<SkuItem>) => {
      await BasketStore.addItem(sku);
      await refresh();
    },
    [refresh]
  );

  const updateQuantity = useCallback(
    async (basketId: string, quantity: number) => {
      await BasketStore.updateItemQuantity(basketId, quantity);
      await refresh();
    },
    [refresh]
  );

  const removeItem = useCallback(
    async (basketId: string) => {
      await BasketStore.removeItem(basketId);
      await refresh();
    },
    [refresh]
  );

  const clearBasket = useCallback(async () => {
    await BasketStore.clearBasket();
    await refresh();
  }, [refresh]);

  const value = useMemo<BasketValue>(
    () => ({
      items,
      total,
      itemCount: items.reduce((n, it) => n + it.quantity, 0),
      hydrated,
      error,
      addItem,
      updateQuantity,
      removeItem,
      clearBasket,
      refresh,
    }),
    [items, total, hydrated, error, addItem, updateQuantity, removeItem, clearBasket, refresh]
  );

  return <BasketContext.Provider value={value}>{children}</BasketContext.Provider>;
}

export function useBasket(): BasketValue {
  const ctx = useContext(BasketContext);
  if (ctx === null) {
    throw new Error('useBasket must be used within a BasketProvider');
  }
  return ctx;
}
