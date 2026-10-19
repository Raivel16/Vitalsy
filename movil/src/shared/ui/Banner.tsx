import { StyleSheet, Text, View } from 'react-native';
import { font, type Palette } from '../theme/tokens';

type Tone = 'info' | 'danger' | 'warning';

function toneColors(tone: Tone, palette: Palette): { background: string; color: string } {
  if (tone === 'danger') {
    return { background: palette.dangerSoft, color: palette.danger };
  }
  if (tone === 'warning') {
    return { background: '#FEF3C7', color: palette.warning };
  }
  return { background: palette.soft, color: palette.text };
}

export function Banner({ message, palette, tone = 'info' }: Readonly<{ message: string; palette: Palette; tone?: Tone }>) {
  const { background, color } = toneColors(tone, palette);
  return (
    <View style={[styles.box, { backgroundColor: background }]}>
      <Text style={[styles.text, { color, fontFamily: font.medium }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 },
  text: { fontSize: 14, lineHeight: 20 },
});
