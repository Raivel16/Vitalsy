import { Pressable, StyleSheet, Text, View } from 'react-native';
import { font, type Palette } from '../theme/tokens';
import { Wordmark } from './Wordmark';

export function AppHeader({
  palette,
  status,
  onStatusPress,
  onProfilePress,
}: {
  palette: Palette;
  status: string;
  onStatusPress?: () => void;
  onProfilePress?: () => void;
}) {
  return (
    <View style={styles.row}>
      <Wordmark />
      <View style={styles.actions}>
        <Pressable onPress={onStatusPress} style={[styles.chip, { backgroundColor: palette.soft }]}>
          <View style={[styles.dot, { backgroundColor: palette.accent }]} />
          <Text style={[styles.chipText, { color: palette.muted, fontFamily: font.semibold }]}>{status}</Text>
        </Pressable>
        <Pressable accessibilityLabel="Perfil" onPress={onProfilePress} style={[styles.avatar, { backgroundColor: palette.accent }]}>
          <Text style={[styles.avatarText, { color: palette.onAccent, fontFamily: font.bold }]}>tú</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { fontSize: 11, letterSpacing: 0.3 },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 11 },
});
