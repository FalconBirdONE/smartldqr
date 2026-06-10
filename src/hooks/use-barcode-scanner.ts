import { useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Shared scanner pipeline for `CameraView` continuous barcode/QR decode.
 *
 * - Requests camera permission once on mount.
 * - Debounces duplicate reads: the same code is ignored while a previous scan
 *   is being processed and for `cooldownMs` after it resolved.
 * - Auto-resets after each scan so the next code is picked up with no manual
 *   re-arm step.
 *
 * Pass the returned `onBarcodeScanned` straight to `CameraView`.
 */
export function useBarcodeScanner(
  onCode: (data: string) => Promise<void> | void,
  { cooldownMs = 2000 }: { cooldownMs?: number } = {}
) {
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);

  const busyRef = useRef(false);
  const lastRef = useRef({ data: '', at: 0 });
  const requestedRef = useRef(false);
  // Keep the latest handler without re-creating the scan callback every render.
  const onCodeRef = useRef(onCode);
  useEffect(() => {
    onCodeRef.current = onCode;
  }, [onCode]);

  useEffect(() => {
    if (permission && !permission.granted && !requestedRef.current) {
      requestedRef.current = true;
      void requestPermission();
    }
  }, [permission, requestPermission]);

  const onBarcodeScanned = useCallback(
    ({ data }: BarcodeScanningResult) => {
      if (!data || busyRef.current) {
        return;
      }
      const now = Date.now();
      if (data === lastRef.current.data && now - lastRef.current.at < cooldownMs) {
        return;
      }
      lastRef.current = { data, at: now };
      busyRef.current = true;
      setBusy(true);
      Promise.resolve(onCodeRef.current(data)).finally(() => {
        // Auto-reset: ready for the next (different) code immediately; the
        // cooldown above keeps the same code from double-appending.
        lastRef.current.at = Date.now();
        busyRef.current = false;
        setBusy(false);
      });
    },
    [cooldownMs]
  );

  return { permission, requestPermission, onBarcodeScanned, busy };
}
