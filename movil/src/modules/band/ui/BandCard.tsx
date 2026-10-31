import { StyleSheet, Text, View } from 'react-native';
import { Banner } from '../../../shared/ui/Banner';
import { Button } from '../../../shared/ui/Button';
import { aire, font } from '../../../shared/theme/tokens';
import type { FoundBand } from '../bandClient';
import type { BandConnection, BandLive, BandMessage } from '../bandController';
import type { BandQuality } from '../domain/gatt';

export type BandCardProps = {
  /** false: sin módulo Bluetooth (Expo Go, web). */
  available: boolean;
  paired: { name: string } | null;
  connection: BandConnection;
  found: FoundBand[];
  live: BandLive | null;
  battery: number | null;
  message: BandMessage | null;
  onScan: () => void;
  onPair: (band: FoundBand) => void;
  onReconnect: () => void;
  onForget: () => void;
  onSwapChannels: () => void;
  onLedTest: () => void;
};

/** Mismos textos que el monitor serie del firmware. */
const QUALITY_TEXT: Record<BandQuality, string> = {
  stabilizing: 'Estabilizando…',
  motion: 'Movimiento: quédate quieto',
  weak_signal: 'Señal débil: apoya mejor el dedo',
  unstable_rhythm: 'Ritmo inestable',
  searching: 'Buscando latidos…',
  good: 'Señal buena',
};

function signalText(live: BandLive): string {
  if (live.phase === 'no_finger') {
    return 'Coloca el dedo sobre el sensor';
  }
  if (live.phase === 'adjusting') {
    return 'Ajustando brillo…';
  }
  return live.quality ? QUALITY_TEXT[live.quality] : 'Midiendo…';
}

function statusText(connection: BandConnection, name: string): string {
  switch (connection) {
    case 'connected':
      return `Conectada · ${name}`;
    case 'connecting':
      return `Conectando con ${name}…`;
    case 'disconnected':
      return `Desconectada · ${name}`;
    default:
      return name;
  }
}

export function BandCard(props: Readonly<BandCardProps>) {
  const { available, paired, connection, found, live, battery, message } = props;
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
      {battery === null ? null : <Text style={styles.meta}>{`Batería ${battery} %`}</Text>}

      {message ? <Banner message={message.text} palette={aire} tone={message.tone} /> : null}

      {paired && connection === 'connected' && live ? (
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
      ) : null}
      {paired && connection === 'connected' && live ? <Text style={styles.signal}>{signalText(live)}</Text> : null}

      {paired ? null : (
        <>
          <Button label="Buscar banda" loading={connection === 'scanning'} disabled={busy} onPress={props.onScan} palette={aire} />
          {found.map((band) => (
            <Button key={band.id} label={`Vincular ${band.name}`} disabled={busy} onPress={() => props.onPair(band)} palette={aire} tone="soft" />
          ))}
        </>
      )}

      {paired && connection !== 'connected' ? (
        <Button label="Reconectar" loading={connection === 'connecting'} disabled={busy} onPress={props.onReconnect} palette={aire} />
      ) : null}
      {paired && connection === 'connected' ? (
        <View style={styles.row}>
          <View style={styles.grow}>
            <Button label="Probar LEDs" onPress={props.onLedTest} palette={aire} tone="ghost" />
          </View>
          <View style={styles.grow}>
            <Button label="Intercambiar rojo/IR" onPress={props.onSwapChannels} palette={aire} tone="ghost" />
          </View>
        </View>
      ) : null}
      {paired ? <Button label="Olvidar banda" disabled={busy} onPress={props.onForget} palette={aire} tone="ghost" /> : null}

      <Text style={styles.note}>Lecturas de bienestar de un sensor propio: no sirven para diagnóstico.</Text>
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
