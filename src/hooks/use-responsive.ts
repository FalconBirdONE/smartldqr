import { useWindowDimensions } from 'react-native';

/**
 * Layouts switch to their tablet variant at >= 768dp wide; below that the
 * existing phone layouts are used unchanged.
 */
export const TABLET_BREAKPOINT = 768;

/** Horizontal screen padding added on tablets so content isn't edge-to-edge. */
export const TABLET_H_PADDING = 48;

export type Responsive = {
  width: number;
  height: number;
  /** True on tablet-sized windows (>= 768dp). Drives every responsive branch. */
  isTablet: boolean;
};

/**
 * Live screen metrics. Backed by `useWindowDimensions`, so it re-renders on
 * rotation and window resize (split-screen) — no Dimensions snapshot staleness.
 */
export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();
  return {
    width,
    height,
    isTablet: width >= TABLET_BREAKPOINT,
  };
}
