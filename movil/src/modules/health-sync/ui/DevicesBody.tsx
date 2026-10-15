import { StyleSheet, Text, View } from 'react-native';
import { Banner } from '../../../shared/ui/Banner';
import { Button } from '../../../shared/ui/Button';
import { aire, font } from '../../../shared/theme/tokens';
import { appleHealthMessage } from '../HealthConnectSource';
import type { HealthStatus } from '../HealthDataSource';

export function DevicesBody({
  status,
  permission,
  pending,
  lastRead,
  syncLabel,
  message,
  onConnect,
  onSync,
}: Readonly<{
  status: HealthStatus;
  permission: 'unknown' | 'granted' | 'denied';
  pending: number;
  lastRead: string | null;
  syncLabel: string;
  message: string | null;
  onConnect: () => void;
  onSync: () => void;
}>) {
  const denied = permission === 'denied' || status.state === 'error' || status.state === 'missing' || status.state === 'unavailable';
  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <Text style={styles.title}>Centro de transmisión</Text>
        <Text style={styles.meta}>{syncLabel}</Text>
        <Text style={styles.meta}>{pending === 0 ? '0 pendientes de enviar' : `${pending} pendientes de enviar`}</Text>
        <Text style={styles.meta}>{lastRead ? `Última lectura local: ${lastRead}` : 'Aún no hay una lectura local'}</Text>
        <Text style={styles.lock}>Cifrado AES-256</Text>
        <Button label="Sincronizar ahora" onPress={onSync} palette={aire} />
      </View>
      {denied || message ? <Banner message={message || status.message} palette={aire} tone={status.state === 'error' || permission === 'denied' ? 'danger' : 'warning'} /> : null}
      <View style={styles.card}>
        <Text style={styles.title}>Health Connect</Text>
        <Text style={styles.meta}>{permission === 'granted' ? 'Enlazado · solo lectura' : 'No vinculado'}</Text>
        <Button label={permission === 'granted' ? 'Actualizar permisos' : 'Conectar'} onPress={onConnect} palette={aire} tone="soft" />
      </View>
      <View style={styles.card}>
        <Text style={styles.title}>Apple Health</Text>
        <Text style={styles.meta}>{appleHealthMessage}</Text>
      </View>
      <Text style={styles.meta}>
        Sin conexión, las mediciones se guardan cifradas en el teléfono y se envían al recuperar la red, si hay un servidor configurado.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  card: { backgroundColor: aire.card, borderRadius: 16, padding: 16, gap: 8 },
  title: { fontFamily: font.semibold, fontSize: 18, color: aire.text },
  meta: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: aire.muted },
  lock: { fontFamily: font.semibold, fontSize: 12, color: aire.accent },
});
