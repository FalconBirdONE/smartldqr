import { StyleSheet, View } from 'react-native';

import { Palette, SCREEN_GUTTER, Space } from '@/constants/design';
import { useResponsive } from '@/hooks/use-responsive';

/**
 * The two-panel split used by payment screens:
 *   LEFT  = payment surface
 *   RIGHT = itemised basket / bill
 * Side-by-side on the landscape tablet; stacks to a single column on phone so
 * the existing narrow layouts stay usable. Renders on the light neutral canvas
 * with a full-width persistent footer slot.
 */
export function SplitLayout({
  left,
  right,
  header,
  footer,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { isTablet } = useResponsive();

  return (
    <View style={styles.root}>
      {header ? <View style={styles.header}>{header}</View> : null}
      <View style={[styles.body, isTablet ? styles.bodyRow : styles.bodyColumn]}>
        <View style={styles.left}>{left}</View>
        <View style={styles.right}>{right}</View>
      </View>
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Palette.canvas,
  },
  header: {
    paddingHorizontal: SCREEN_GUTTER,
    paddingTop: Space.lg,
  },
  body: {
    flex: 1,
    padding: SCREEN_GUTTER,
    gap: SCREEN_GUTTER,
  },
  bodyRow: {
    flexDirection: 'row',
  },
  bodyColumn: {
    flexDirection: 'column',
  },
  left: {
    flex: 1.05,
  },
  right: {
    flex: 1,
  },
});
