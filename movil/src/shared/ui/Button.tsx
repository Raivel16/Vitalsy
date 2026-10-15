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

function backgroundFor(tone: NonNullable<Props['tone']>, palette: Palette): string {
  if (tone === 'primary') {
    return palette.accent;
  }
  return tone === 'soft' ? palette.soft : 'transparent';
}

function opacityFor(disabled: boolean | undefined, pressed: boolean): number {
  if (disabled) {
    return 0.5;
  }
  return pressed ? 0.9 : 1;
}

export function Button({ label, onPress, palette, tone = 'primary', disabled, loading }: Readonly<Props>) {
  const background = backgroundFor(tone, palette);
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
        { backgroundColor: background, borderColor: tone === 'ghost' ? palette.border : 'transparent', opacity: opacityFor(disabled, pressed) },
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
