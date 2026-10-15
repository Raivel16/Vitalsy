import { StyleSheet, Text, View } from 'react-native';
import { font, type Palette } from '../theme/tokens';

type Tone = 'info' | 'danger' | 'warning';

export function Banner({ message, palette, tone = 'info' }: Readonly<{ message: string; palette: Palette; tone?: Tone }>) {
  const background = tone === 'danger' ? palette.dangerSoft : tone === 'warning' ? '#FEF3C7' : palette.soft;
  const color = tone === 'danger' ? palette.danger : tone === 'warning' ? palette.warning : palette.text;
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
