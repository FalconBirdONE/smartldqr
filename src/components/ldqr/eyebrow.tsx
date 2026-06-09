import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { eyebrowStyle } from '@/constants/design';

/**
 * Spaced, small-caps section eyebrow — e.g. "PICK OF THE WEEK",
 * "MAKE IT A MEAL · POPULAR". Sits above a section heading.
 */
export function Eyebrow({
  children,
  color,
  style,
}: {
  children: React.ReactNode;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[styles.eyebrow, color ? { color } : null, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  eyebrow: eyebrowStyle,
});
