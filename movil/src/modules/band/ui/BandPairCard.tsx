import { StyleSheet, Text, View } from 'react-native';
import { Banner } from '../../../shared/ui/Banner';
import { Button } from '../../../shared/ui/Button';
import { aire, font } from '../../../shared/theme/tokens';
import type { FoundBand } from '../bandClient';
import type { BandConnection, BandMessage } from '../bandController';
import { BAND_DISCLAIMER, statusText } from './bandText';

export type BandPairCardProps = {
  /** false: sin módulo Bluetooth (Expo Go, web). */
  available: boolean;
  paired: { name: string } | null;
  connection: BandConnection;
  found: FoundBand[];
  message: BandMessage | null;
  onScan: () => void;
  onPair: (band: FoundBand) => void;
  onForget: () => void;
};

/** Perfil › Dispositivos: solo vincula u olvida la banda. Las lecturas se ven en Hoy (BandTodayCard). */
export function BandPairCard({ available, paired, connection, found, message, onScan, onPair, onForget }: Readonly<BandPairCardProps>) {
  const busy = connection === 'scanning' || connection === 'connecting';

  if (!available) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Vitalsy Band</Text>
        <Text style={styles.meta}>Bluetooth necesita un development build de la app (no funciona en Expo Go).</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Vitalsy Band</Text>
      <Text style={styles.meta}>{paired ? statusText(connection, paired.name) : 'Sin banda vinculada'}</Text>
      {paired ? (
        <Text style={styles.meta}>Verás sus lecturas en Hoy.</Text>
      ) : (
        <Text style={styles.meta}>Escribe la clave de 6 dígitos que aparece en tu banda cuando el teléfono la pida.</Text>
      )}

      {/* Con la banda vinculada, los avisos (guardado, reconexión) salen en Hoy. */}
      {message && !paired ? <Banner message={message.text} palette={aire} tone={message.tone} /> : null}

      {paired ? (
        <Button label="Olvidar banda" disabled={busy} onPress={onForget} palette={aire} tone="ghost" />
      ) : (
        <>
          <Button label="Buscar banda" loading={connection === 'scanning'} disabled={busy} onPress={onScan} palette={aire} />
          {found.map((band) => (
            <Button key={band.id} label={`Vincular ${band.name}`} disabled={busy} onPress={() => onPair(band)} palette={aire} tone="soft" />
          ))}
        </>
      )}

      <Text style={styles.note}>{BAND_DISCLAIMER}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: aire.card, borderRadius: 16, padding: 16, gap: 8 },
  title: { fontFamily: font.semibold, fontSize: 18, color: aire.text },
  meta: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: aire.muted },
  note: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: aire.muted },
});
