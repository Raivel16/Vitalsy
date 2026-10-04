import { StyleSheet, Text, View } from 'react-native';
import { font } from '../theme/tokens';

export function Wordmark() {
  return (
    <View style={styles.row}>
      <Text style={styles.word}>Vitalsy</Text>
      <Text style={styles.pill}>Life</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  word: { fontFamily: font.bold, fontSize: 22, color: '#1C242B', letterSpacing: -0.3 },
  pill: {
    backgroundColor: '#E6F4F3',
    color: '#2B8A88',
    fontFamily: font.semibold,
    fontSize: 11,
    letterSpacing: 0.4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
});
