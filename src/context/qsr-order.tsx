import { createContext, useCallback, useContext, useMemo, useRef, useState, type PropsWithChildren } from 'react';

import { MEAL_UPGRADE, type MenuItem } from '@/constants/qsr-menu';

export type LineOptions = {
  meal?: boolean;
  spice?: string;
  sauce?: string;
};

export type OrderLine = {
  lineId: string;
  item: MenuItem;
  qty: number;
  options?: LineOptions;
};

/** Per-line unit price including any meal upgrade. */
export function lineUnitPrice(line: OrderLine): number {
  return line.item.price + (line.options?.meal ? MEAL_UPGRADE.price : 0);
}

/** Short human note for a line's options, e.g. "Meal · Spicy · Mint". */
export function lineNote(line: OrderLine): string | undefined {
  const parts: string[] = [];
  if (line.options?.meal) parts.push('Meal');
  if (line.options?.spice) parts.push(line.options.spice);
  if (line.options?.sauce && line.options.sauce !== 'No sauce') parts.push(line.options.sauce);
  return parts.length ? parts.join(' · ') : undefined;
}

const PACKING_PER_ITEM = 8;

type QsrOrderValue = {
  lines: OrderLine[];
  dineIn: boolean;
  tip: number;
  itemCount: number;
  subtotal: number;
  packing: number;
  total: number;
  addLine: (item: MenuItem, options?: LineOptions) => void;
  incLine: (lineId: string) => void;
  decLine: (lineId: string) => void;
  setDineIn: (v: boolean) => void;
  setTip: (v: number) => void;
  clear: () => void;
};

const QsrOrderContext = createContext<QsrOrderValue | null>(null);

export function QsrOrderProvider({ children }: PropsWithChildren) {
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [dineIn, setDineIn] = useState(true);
  const [tip, setTip] = useState(0);
  const counter = useRef(0);

  const addLine = useCallback((item: MenuItem, options?: LineOptions) => {
    setLines((prev) => {
      // Merge identical simple items (no options) into one line.
      if (!options || (!options.meal && !options.spice && !options.sauce)) {
        const idx = prev.findIndex((l) => l.item.id === item.id && !lineNote(l));
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
          return next;
        }
      }
      counter.current += 1;
      return [...prev, { lineId: `L${counter.current}`, item, qty: 1, options }];
    });
  }, []);

  const incLine = useCallback((lineId: string) => {
    setLines((prev) => prev.map((l) => (l.lineId === lineId ? { ...l, qty: l.qty + 1 } : l)));
  }, []);

  const decLine = useCallback((lineId: string) => {
    setLines((prev) =>
      prev
        .map((l) => (l.lineId === lineId ? { ...l, qty: l.qty - 1 } : l))
        .filter((l) => l.qty > 0)
    );
  }, []);

  const clear = useCallback(() => {
    setLines([]);
    setTip(0);
    setDineIn(true);
  }, []);

  const value = useMemo<QsrOrderValue>(() => {
    const itemCount = lines.reduce((n, l) => n + l.qty, 0);
    const subtotal = lines.reduce((s, l) => s + lineUnitPrice(l) * l.qty, 0);
    const packing = dineIn ? 0 : itemCount * PACKING_PER_ITEM;
    const total = subtotal + packing + tip;
    return {
      lines,
      dineIn,
      tip,
      itemCount,
      subtotal,
      packing,
      total,
      addLine,
      incLine,
      decLine,
      setDineIn,
      setTip,
      clear,
    };
  }, [lines, dineIn, tip, addLine, incLine, decLine, clear]);

  return <QsrOrderContext.Provider value={value}>{children}</QsrOrderContext.Provider>;
}

export function useQsrOrder(): QsrOrderValue {
  const ctx = useContext(QsrOrderContext);
  if (ctx === null) {
    throw new Error('useQsrOrder must be used within a QsrOrderProvider');
  }
  return ctx;
}
