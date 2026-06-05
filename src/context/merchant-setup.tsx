import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { NativeModules } from 'react-native';

const { MerchantModule } = NativeModules as {
  MerchantModule?: {
    isOnboardingComplete(): Promise<boolean>;
    clearMerchantDetails(): Promise<boolean>;
  };
};

/**
 * Merchant setup state, hydrated from EncryptedSharedPreferences via the
 * native MerchantModule so completed onboarding survives app restarts.
 * Falls back to in-memory state when the native module is unavailable
 * (e.g. web or Expo Go).
 */
export type MerchantSetupContextValue = {
  /** Whether the merchant has completed onboarding/configuration. */
  isSetupComplete: boolean;
  /** Whether the persisted flag has been read; gate routing until true. */
  isHydrated: boolean;
  /** Marks setup as complete (called at the end of onboarding). */
  completeSetup: () => void;
  /** Resets setup state and clears persisted merchant details. */
  resetSetup: () => void;
};

const MerchantSetupContext = createContext<MerchantSetupContextValue | null>(null);

export function MerchantSetupProvider({ children }: PropsWithChildren) {
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Read the persisted onboarding flag once on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const complete = MerchantModule ? await MerchantModule.isOnboardingComplete() : false;
        if (!cancelled) {
          setIsSetupComplete(complete);
        }
      } catch {
        // Unreadable prefs are treated as not onboarded; the gate shows onboarding.
      } finally {
        if (!cancelled) {
          setIsHydrated(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<MerchantSetupContextValue>(
    () => ({
      isSetupComplete,
      isHydrated,
      completeSetup: () => setIsSetupComplete(true),
      resetSetup: () => {
        setIsSetupComplete(false);
        MerchantModule?.clearMerchantDetails().catch(() => {
          // Best-effort: in-memory state is already reset.
        });
      },
    }),
    [isSetupComplete, isHydrated]
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
