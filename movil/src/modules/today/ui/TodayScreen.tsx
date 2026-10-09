import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../../../shared/ui/AppHeader';
import { Banner } from '../../../shared/ui/Banner';
import { Button } from '../../../shared/ui/Button';
import { Field } from '../../../shared/ui/Field';
import { Screen } from '../../../shared/ui/Screen';
import { aire, font } from '../../../shared/theme/tokens';
import { syncStatusLabel } from '../../health-sync/domain/syncQueue';
import { useLife } from '../../life/LifeProvider';
import { apiBaseUrl } from '../../../shared/api/lifeClient';
import { TodayBody } from './TodayBody';

export function TodayScreen() {
  const router = useRouter();
  const { life, online, refresh, syncHealth } = useLife();
  const user = life.currentUser();
  const [manualOpen, setManualOpen] = useState(false);
  const [kind, setKind] = useState<'heart_rate' | 'spo2'>('heart_rate');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) {
      return;
    }
    started.current = true;
    void syncHealth().then((message) => setSyncMessage(message));
  }, [syncHealth]);

  const snapshot = life.today();
  const dateLabel = new Intl.DateTimeFormat('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  return (
    <Screen palette={aire}>
      <AppHeader
        onProfilePress={() => router.push('/perfil')}
        onStatusPress={() => router.push('/hoy/avisos')}
        palette={aire}
        status={syncStatusLabel(online, life.pendingSyncCount(), Boolean(apiBaseUrl()), life.state.lastServerSyncAt)}
      />
      {syncMessage ? <Banner message={syncMessage} palette={aire} tone={syncMessage.includes('No ') || syncMessage.includes('no ') ? 'warning' : 'info'} /> : null}
      <TodayBody
        dateLabel={dateLabel}
        name={user?.name ?? 'ahí'}
        offline={!online}
        onDismissNudge={() => {
          if (snapshot.nudge) {
            life.dismissNotice(snapshot.nudge.id);
            void refresh();
          }
        }}
        onManual={() => setManualOpen(true)}
        onOpenNotices={() => router.push('/hoy/avisos')}
        onSync={() => void syncHealth().then((message) => setSyncMessage(message))}
        snapshot={snapshot}
        syncLabel={syncStatusLabel(online, life.pendingSyncCount(), Boolean(apiBaseUrl()), life.state.lastServerSyncAt)}
      />
      <Modal animationType="slide" transparent visible={manualOpen}>
        <View style={styles.modal}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Lectura manual</Text>
            <View style={styles.row}>
              <Button label="Pulso" onPress={() => setKind('heart_rate')} palette={aire} tone={kind === 'heart_rate' ? 'primary' : 'soft'} />
              <Button label="SpO2" onPress={() => setKind('spo2')} palette={aire} tone={kind === 'spo2' ? 'primary' : 'soft'} />
            </View>
            <Field error={error ?? undefined} keyboardType="number-pad" label={kind === 'heart_rate' ? 'Latidos por minuto' : 'Porcentaje'} onChangeText={setValue} palette={aire} value={value} />
            <Button
              label="Guardar lectura"
              onPress={() => {
                const result = life.addManual(kind, value);
                if (!result.ok) {
                  setError(result.message);
                  return;
                }
                setError(null);
                setValue('');
                setManualOpen(false);
                void refresh();
              }}
              palette={aire}
            />
            <Button label="Cancelar" onPress={() => setManualOpen(false)} palette={aire} tone="ghost" />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(20,28,35,0.2)' },
  sheet: { backgroundColor: aire.canvas, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12 },
  sheetTitle: { fontFamily: font.semibold, fontSize: 22, color: aire.text },
  row: { flexDirection: 'row', gap: 8 },
});
