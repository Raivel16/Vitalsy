import { StyleSheet, Text, View } from 'react-native';
import { brand, font } from '../theme/tokens';

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
  word: { fontFamily: font.bold, fontSize: 22, color: brand.word, letterSpacing: -0.3 },
  pill: {
    backgroundColor: brand.pillBg,
    color: brand.pillText,
    fontFamily: font.semibold,
    fontSize: 11,
    letterSpacing: 0.4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: 'hidden',
  },
});
