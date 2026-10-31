import { StyleSheet, Text, View } from 'react-native';
import { Banner } from '../../../shared/ui/Banner';
import { Button } from '../../../shared/ui/Button';
import { aire, font } from '../../../shared/theme/tokens';
import type { BandConnection, BandLive, BandMessage } from '../bandController';
import { BAND_DISCLAIMER, signalText, statusText } from './bandText';

export type BandTodayCardProps = {
  paired: { name: string } | null;
  connection: BandConnection;
  live: BandLive | null;
  battery: number | null;
  message: BandMessage | null;
  onReconnect: () => void;
  onSwapChannels: () => void;
  onLedTest: () => void;
};

/** Hoy: lecturas en vivo, estado y avisos de la banda vinculada. Sin banda vinculada no se muestra. */
export function BandTodayCard({ paired, connection, live, battery, message, onReconnect, onSwapChannels, onLedTest }: Readonly<BandTodayCardProps>) {
  if (!paired) {
    return null;
  }
  const connected = connection === 'connected';
  const busy = connection === 'scanning' || connection === 'connecting';

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Vitalsy Band</Text>
      <Text style={styles.meta}>{statusText(connection, paired.name)}</Text>
      {battery === null ? null : <Text style={styles.meta}>{`Batería ${battery} %`}</Text>}

      {message ? <Banner message={message.text} palette={aire} tone={message.tone} /> : null}

      {connected && live ? (
        <>
          <View style={styles.live}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Pulso</Text>
              <Text style={styles.metricValue}>{live.bpm === null ? '--' : `${live.bpm} lpm`}</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>SpO2</Text>
              <Text style={styles.metricValue}>{live.spo2 === null ? '--' : `${live.spo2} %`}</Text>
            </View>
          </View>
          <Text style={styles.signal}>{signalText(live)}</Text>
        </>
      ) : null}

      {connected ? (
        <View style={styles.row}>
          <View style={styles.grow}>
            <Button label="Probar LEDs" onPress={onLedTest} palette={aire} tone="ghost" />
          </View>
          <View style={styles.grow}>
            <Button label="Intercambiar rojo/IR" onPress={onSwapChannels} palette={aire} tone="ghost" />
          </View>
        </View>
      ) : (
        <Button label="Reconectar" loading={connection === 'connecting'} disabled={busy} onPress={onReconnect} palette={aire} />
      )}

      <Text style={styles.note}>{BAND_DISCLAIMER}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: aire.card, borderRadius: 16, padding: 16, gap: 8 },
  title: { fontFamily: font.semibold, fontSize: 18, color: aire.text },
  meta: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: aire.muted },
  live: { flexDirection: 'row', gap: 12 },
  metric: { flex: 1, backgroundColor: aire.soft, borderRadius: 12, padding: 12, gap: 2 },
  metricLabel: { fontFamily: font.medium, fontSize: 12, color: aire.muted },
  metricValue: { fontFamily: font.bold, fontSize: 24, color: aire.text },
  signal: { fontFamily: font.semibold, fontSize: 14, color: aire.accent },
  row: { flexDirection: 'row', gap: 8 },
  grow: { flex: 1 },
  note: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, color: aire.muted },
});
