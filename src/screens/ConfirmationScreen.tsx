import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, StyleSheet, Text, View } from 'react-native';

export default function ConfirmationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    transaction_id?: string;
    total_amount?: string;
    timestamp?: string;
  }>();

  const transactionId = params.transaction_id ?? '';
  const totalAmount = Number(params.total_amount ?? 0);
  const timestamp = params.timestamp ? new Date(params.timestamp).toLocaleString() : '';

  return (
    <View style={styles.center}>
      <Text style={styles.successIndicator}>✓</Text>
      <Text style={styles.title}>Payment Confirmed</Text>
      {transactionId ? (
        <>
          <Text style={styles.amount}>₹{totalAmount.toFixed(2)}</Text>
          <Text style={styles.detail}>Transaction: {transactionId}</Text>
          {timestamp ? <Text style={styles.detail}>{timestamp}</Text> : null}
        </>
      ) : (
        <Text style={styles.detail}>No transaction yet.</Text>
      )}
      <Button title="New Order" onPress={() => router.replace('/')} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  successIndicator: {
    fontSize: 72,
    color: 'green',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  amount: {
    fontSize: 20,
  },
  detail: {
    fontSize: 13,
    color: '#666',
  },
});
