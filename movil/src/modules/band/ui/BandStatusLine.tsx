import { StyleSheet, Text, View } from 'react-native';
import { Banner } from '../../../shared/ui/Banner';
import { Button } from '../../../shared/ui/Button';
import { aire, font } from '../../../shared/theme/tokens';
import type { BandConnection, BandMessage } from '../bandController';

export type BandStatusLineProps = {
  paired: { name: string } | null;
  connection: BandConnection;
  battery: number | null;
  message: BandMessage | null;
  onReconnect: () => void;
};

function label(connection: BandConnection): string {
  switch (connection) {
    case 'connected':
      return 'Conectada';
    case 'connecting':
      return 'Conectando…';
    case 'disconnected':
      return 'Desconectada';
    default:
      return 'Sin conexión';
  }
}

/**
 * Hoy, junto a las tarjetas de pulso y SpO2: de dónde vienen esos valores. Las lecturas en sí van en las
 * mismas tarjetas que usa Health Connect. Sin banda vinculada no se muestra.
 */
export function BandStatusLine({ paired, connection, battery, message, onReconnect }: Readonly<BandStatusLineProps>) {
  if (!paired) {
    return null;
  }
  const connected = connection === 'connected';
  const busy = connection === 'connecting';
  const batteryText = battery === null ? '' : ` · Batería ${battery} %`;

  return (
    <View style={styles.wrap}>
      <Text style={styles.status}>{`Vitalsy Band · ${label(connection)}${batteryText}`}</Text>
      {message ? <Banner message={message.text} palette={aire} tone={message.tone} /> : null}
      {connected ? null : <Button label="Reconectar" loading={busy} disabled={busy} onPress={onReconnect} palette={aire} tone="soft" />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  status: { fontFamily: font.semibold, fontSize: 12, color: aire.accent },
});
