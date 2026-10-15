import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { font, type Palette } from '../theme/tokens';

type Props = {
  label: string;
  onPress: () => void;
  palette: Palette;
  tone?: 'primary' | 'soft' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
};

export function Button({ label, onPress, palette, tone = 'primary', disabled, loading }: Readonly<Props>) {
  const background = tone === 'primary' ? palette.accent : tone === 'soft' ? palette.soft : 'transparent';
  const color = tone === 'primary' ? palette.onAccent : palette.accent;
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled || loading), busy: Boolean(loading) }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: background, borderColor: tone === 'ghost' ? palette.border : 'transparent', opacity: disabled ? 0.5 : pressed ? 0.9 : 1 },
      ]}
    >
      {loading ? <ActivityIndicator color={color} /> : <Text style={[styles.label, { color, fontFamily: font.semibold }]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 48,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
  },
  label: { fontSize: 14 },
});
