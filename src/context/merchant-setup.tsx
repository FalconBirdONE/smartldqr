import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';

/**
 * In-memory merchant setup state.
 *
 * For now this is a simple boolean flag held in React state. It controls whether
 * the onboarding flow must be shown. Persistence via EncryptedSharedPreferences
 * comes later — at that point only this provider needs to change.
 */
export type MerchantSetupContextValue = {
  /** Whether the merchant has completed onboarding/configuration. */
  isSetupComplete: boolean;
  /** Marks setup as complete (called at the end of onboarding). */
  completeSetup: () => void;
  /** Resets setup state back to incomplete (useful for testing the gate). */
  resetSetup: () => void;
};

const MerchantSetupContext = createContext<MerchantSetupContextValue | null>(null);

export function MerchantSetupProvider({ children }: PropsWithChildren) {
  const [isSetupComplete, setIsSetupComplete] = useState(false);

  const value = useMemo<MerchantSetupContextValue>(
    () => ({
      isSetupComplete,
      completeSetup: () => setIsSetupComplete(true),
      resetSetup: () => setIsSetupComplete(false),
    }),
    [isSetupComplete]
  );

  return <MerchantSetupContext.Provider value={value}>{children}</MerchantSetupContext.Provider>;
}

export function useMerchantSetup(): MerchantSetupContextValue {
  const context = useContext(MerchantSetupContext);
  if (context === null) {
    throw new Error('useMerchantSetup must be used within a MerchantSetupProvider');
  }
  return context;
}
