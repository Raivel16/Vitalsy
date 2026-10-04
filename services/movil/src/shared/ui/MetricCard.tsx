import { StyleSheet, Text, View } from 'react-native';
import { font, type Palette } from '../theme/tokens';

export function MetricCard({
  palette,
  label,
  value,
  unit,
  footnote,
}: {
  palette: Palette;
  label: string;
  value: string;
  unit: string;
  footnote: string;
}) {
  return (
    <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
      <Text style={[styles.label, { color: palette.muted, fontFamily: font.semibold }]}>{label.toUpperCase()}</Text>
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: palette.text, fontFamily: font.bold }]}>{value}</Text>
        {unit ? <Text style={[styles.unit, { color: palette.muted, fontFamily: font.medium }]}>{unit}</Text> : null}
      </View>
      <Text style={[styles.foot, { color: palette.accent, fontFamily: font.semibold }]}>{footnote}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, minWidth: '46%', borderRadius: 16, borderWidth: 1, padding: 14, gap: 8 },
  label: { fontSize: 11, letterSpacing: 0.6 },
  valueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 4 },
  value: { fontSize: 32, lineHeight: 36, letterSpacing: -0.6, fontVariant: ['tabular-nums'] },
  unit: { fontSize: 14, marginBottom: 4 },
  foot: { fontSize: 11, lineHeight: 14 },
});
