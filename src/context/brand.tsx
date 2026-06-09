import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';

import { HOUSE_BRAND, REFERENCE_BRANDS, type Brand } from '@/constants/brands';

/**
 * Active brand canvas for the device. Defaults to the Smart LDQR house brand;
 * exposes a setter so Settings can swap the canvas to a reference scenario
 * (Decathlon / Chai Point) to demo per-merchant theming of the same system.
 */
type BrandContextValue = {
  brand: Brand;
  /** All selectable canvases (house + reference scenarios). */
  options: Brand[];
  setBrandId: (id: string) => void;
};

const ALL_BRANDS: Brand[] = [HOUSE_BRAND, ...Object.values(REFERENCE_BRANDS)];

const BrandContext = createContext<BrandContextValue | null>(null);

export function BrandProvider({ children }: PropsWithChildren) {
  const [brand, setBrand] = useState<Brand>(HOUSE_BRAND);

  const value = useMemo<BrandContextValue>(
    () => ({
      brand,
      options: ALL_BRANDS,
      setBrandId: (id: string) => {
        const next = ALL_BRANDS.find((b) => b.id === id);
        if (next) setBrand(next);
      },
    }),
    [brand]
  );

  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export function useBrand(): BrandContextValue {
  const ctx = useContext(BrandContext);
  if (ctx === null) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return ctx;
}
