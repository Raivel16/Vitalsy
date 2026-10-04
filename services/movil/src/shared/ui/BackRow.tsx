import { Pressable, StyleSheet, Text, View } from 'react-native';
import { font, type Palette } from '../theme/tokens';

export function BackRow({ title, subtitle, palette, onBack }: { title: string; subtitle?: string; palette: Palette; onBack: () => void }) {
  return (
    <View style={styles.wrap}>
      <Pressable accessibilityRole="button" onPress={onBack} style={[styles.back, { backgroundColor: palette.soft }]}>
        <Text style={[styles.backText, { color: palette.accent, fontFamily: font.semibold }]}>Volver</Text>
      </Pressable>
      <Text style={[styles.title, { color: palette.text, fontFamily: font.bold }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: palette.muted, fontFamily: font.regular }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  back: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  backText: { fontSize: 12 },
  title: { fontSize: 28, letterSpacing: -0.4 },
  subtitle: { fontSize: 14, lineHeight: 20 },
});
