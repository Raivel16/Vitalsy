import { MaterialIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { font, type Palette } from '../theme/tokens';

type Props = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  palette: Palette;
  error?: string;
  secureTextEntry?: boolean;
  revealable?: boolean;
  keyboardType?: 'default' | 'email-address' | 'number-pad' | 'phone-pad';
  autoCapitalize?: 'none' | 'words' | 'sentences';
};

export function Field({ label, value, onChangeText, palette, error, secureTextEntry, revealable, keyboardType, autoCapitalize }: Props) {
  const [hidden, setHidden] = useState(true);
  const isSecure = revealable ? hidden : secureTextEntry;
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: palette.muted, fontFamily: font.semibold }]}>{label}</Text>
      <View
        style={[
          styles.inputRow,
          {
            backgroundColor: palette.card,
            borderColor: error ? palette.danger : palette.border,
          },
        ]}
      >
        <TextInput
          accessibilityLabel={label}
          autoCapitalize={autoCapitalize ?? 'none'}
          keyboardType={keyboardType}
          onChangeText={onChangeText}
          secureTextEntry={isSecure}
          style={[styles.input, { color: palette.text, fontFamily: font.regular }]}
          value={value}
        />
        {revealable ? (
          <Pressable
            accessibilityLabel={hidden ? 'Mostrar contraseña' : 'Ocultar contraseña'}
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setHidden((current) => !current)}
            style={styles.eye}
          >
            <MaterialIcons color={palette.muted} name={hidden ? 'visibility' : 'visibility-off'} size={22} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={[styles.error, { color: palette.danger, fontFamily: font.medium }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 12, letterSpacing: 0.2 },
  inputRow: { minHeight: 48, borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  input: { flex: 1, minHeight: 48, paddingHorizontal: 14, fontSize: 16 },
  eye: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  error: { fontSize: 12, lineHeight: 16 },
});
