import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';

export type ScreenPlaceholderProps = {
  /** The screen name label, centered on screen. */
  label: string;
};

/**
 * A blank screen showing only its name label, centered. Used while screens are
 * placeholders during the navigation-shell phase.
 */
export function ScreenPlaceholder({ label }: ScreenPlaceholderProps) {
  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle">{label}</ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
