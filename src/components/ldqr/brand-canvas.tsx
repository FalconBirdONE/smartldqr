import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop, Circle, RadialGradient } from 'react-native-svg';

import type { Brand } from '@/constants/brands';

/**
 * Full-bleed brand canvas — the ambient surface behind IDLE/DOOH and the QSR
 * welcome/confirmation screens. A diagonal brand→deep gradient with a soft
 * accent glow in the top-right so each merchant's dominant colour owns the
 * screen. Children render on top.
 */
export function BrandCanvas({
  brand,
  children,
  style,
}: {
  brand: Brand;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.fill, style]}>
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={brand.brand} />
            <Stop offset="100%" stopColor={brand.brandDeep} />
          </LinearGradient>
          <RadialGradient id="glow" cx="82%" cy="14%" r="60%">
            <Stop offset="0%" stopColor={brand.brandAccent} stopOpacity={0.5} />
            <Stop offset="100%" stopColor={brand.brandAccent} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#bg)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#glow)" />
        {/* A couple of faint orbs add depth to the ambient surface. */}
        <Circle cx="14%" cy="92%" r="180" fill={brand.brandAccent} opacity={0.1} />
        <Circle cx="68%" cy="78%" r="120" fill="#FFFFFF" opacity={0.04} />
      </Svg>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flex: 1 },
});
