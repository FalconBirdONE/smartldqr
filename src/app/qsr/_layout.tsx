import { Stack } from 'expo-router';

import { QsrOrderProvider } from '@/context/qsr-order';

/** The U4 QSR self-order journey: welcome → menu → review → token. */
export default function QsrLayout() {
  return (
    <QsrOrderProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="menu" />
        <Stack.Screen name="review" />
        <Stack.Screen name="token" />
      </Stack>
    </QsrOrderProvider>
  );
}
