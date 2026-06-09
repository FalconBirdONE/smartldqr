import { useEffect, useRef, useState } from 'react';

/**
 * Visible countdown for terminal screens (confirmation, token) that auto-close.
 * Ticks once a second from `seconds` to 0, then fires `onComplete` once.
 * Returns the remaining whole seconds for display.
 */
export function useCountdown(seconds: number, onComplete?: () => void): number {
  const [remaining, setRemaining] = useState(seconds);
  const done = useRef(false);
  const cb = useRef(onComplete);

  // Keep the latest callback without retriggering the interval.
  useEffect(() => {
    cb.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          if (!done.current) {
            done.current = true;
            cb.current?.();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return remaining;
}
