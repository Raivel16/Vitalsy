import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../shared/ui/Button';
import { Screen } from '../../../shared/ui/Screen';
import { Wordmark } from '../../../shared/ui/Wordmark';
import { aire, font } from '../../../shared/theme/tokens';

export function WelcomeScreen() {
  const router = useRouter();
  return (
    <Screen palette={aire}>
      <Wordmark />
      <View style={styles.hero}>
        <Text style={styles.kicker}>Flujo de vitalidad</Text>
        <Text style={styles.kickerRight}>En sintonía</Text>
      </View>
      <Text style={styles.title}>Tu bienestar diario, al ritmo de tu cuerpo</Text>
      <Text style={styles.lead}>Seguimiento respecto a tu línea de base. Información preventiva, no un diagnóstico.</Text>
      <View style={styles.chips}>
        {['Tendencias personales', 'Privacidad absoluta', 'Sin alarmas hospitalarias'].map((label) => (
          <Text key={label} style={styles.chip}>{label}</Text>
        ))}
      </View>
      <Button label="Crear cuenta" onPress={() => router.push('/auth?mode=register')} palette={aire} />
      <Button label="Ya tengo cuenta" onPress={() => router.push('/auth')} palette={aire} tone="soft" />
      <Button label="¿Tienes código de alta médica?" onPress={() => router.push('/auth?next=activar')} palette={aire} tone="ghost" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: aire.soft, borderRadius: 20, padding: 16, flexDirection: 'row', justifyContent: 'space-between' },
  kicker: { fontFamily: font.semibold, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: aire.muted },
  kickerRight: { fontFamily: font.semibold, fontSize: 12, color: aire.accent },
  title: { fontFamily: font.semibold, fontSize: 30, lineHeight: 36, letterSpacing: -0.4, color: aire.text },
  lead: { fontFamily: font.regular, fontSize: 16, lineHeight: 24, color: aire.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: aire.soft, color: aire.text, fontFamily: font.semibold, fontSize: 12, borderRadius: 999, overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 8 },
});
