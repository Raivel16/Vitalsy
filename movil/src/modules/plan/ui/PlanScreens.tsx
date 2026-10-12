import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { AppHeader } from '../../../shared/ui/AppHeader';
import { BackRow } from '../../../shared/ui/BackRow';
import { Banner } from '../../../shared/ui/Banner';
import { Button } from '../../../shared/ui/Button';
import { Field } from '../../../shared/ui/Field';
import { Screen } from '../../../shared/ui/Screen';
import { aire, font } from '../../../shared/theme/tokens';
import { useLife, scheduleMedicationReminder } from '../../life/LifeProvider';

export function PlanScreen() {
  const router = useRouter();
  const { life } = useLife();
  const plan = life.state.plan;

  return (
    <Screen palette={aire}>
      <AppHeader onProfilePress={() => router.push('/perfil')} palette={aire} status={plan ? 'Vigilancia en casa' : 'Sin plan'} />
      <Text style={styles.title}>Plan de seguimiento</Text>
      {!plan ? (
        <View style={styles.card}>
          <Text style={styles.lead}>Todavía no hay un plan de alta vinculado. No inventamos medicación.</Text>
          <Button label="Activar con código o QR" onPress={() => router.push('/plan/activar')} palette={aire} />
        </View>
      ) : (
        <View style={styles.wrap}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Vigilancia pasiva en casa</Text>
          </View>
          <Text style={styles.section}>Medicación ambulatoria</Text>
          {plan.medications.map((item) => (
            <View key={item.id} style={styles.card}>
              <Text style={styles.itemTitle}>{item.name}</Text>
              <Text style={styles.lead}>{item.dose} · {item.schedule} · {item.status === 'taken' ? 'Tomada' : item.status === 'postponed' ? 'Pospuesta' : 'Pendiente'}</Text>
              <Button label="Ver toma" onPress={() => router.push(`/plan/medicacion/${item.id}`)} palette={aire} tone="soft" />
            </View>
          ))}
          {plan.comfortSigns.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.section}>Signos de confort</Text>
              {plan.comfortSigns.map((item) => <Text key={item} style={styles.lead}>{item}</Text>)}
            </View>
          ) : null}
          {plan.homeCare.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.section}>Cuidados en casa</Text>
              {plan.homeCare.map((item) => <Text key={item} style={styles.lead}>{item}</Text>)}
            </View>
          ) : null}
        </View>
      )}
    </Screen>
  );
}

export function ActivatePlanScreen() {
  const router = useRouter();
  const { activateFromCode } = useLife();
  const [code, setCode] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  async function submit(raw: string) {
    if (busy) {
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const result = await activateFromCode(raw);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      router.replace('/plan');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen palette={aire}>
      <BackRow onBack={() => router.back()} palette={aire} subtitle="El plan solo se activa si el QR trae las indicaciones o el servidor las devuelve." title="Activar seguimiento post-alta" />
      {message ? <Banner message={message} palette={aire} tone="danger" /> : null}
      {scanning && permission?.granted ? (
        <View style={styles.camera}>
          <CameraView
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={({ data }) => {
              setScanning(false);
              setCode(data);
              void submit(data);
            }}
            style={StyleSheet.absoluteFill}
          />
        </View>
      ) : null}
      <Button
        label="Escanear QR de la hoja de alta"
        onPress={() => {
          if (!permission?.granted) {
            void requestPermission().then((next) => {
              if (!next.granted) {
                setMessage('Sin permiso de cámara. Puedes escribir el código.');
                return;
              }
              setScanning(true);
            });
            return;
          }
          setScanning(true);
        }}
        palette={aire}
      />
      <Field label="Código de alta" onChangeText={setCode} palette={aire} value={code} />
      <Button disabled={busy} label="Activar plan" loading={busy} onPress={() => void submit(code)} palette={aire} tone="soft" />
    </Screen>
  );
}

export function MedicationScreen({ id }: { id: string }) {
  const router = useRouter();
  const { life, refresh } = useLife();
  const medication = life.state.plan?.medications.find((item) => item.id === id);

  if (!medication) {
    return (
      <Screen palette={aire}>
        <BackRow onBack={() => router.back()} palette={aire} title="Toma" />
        <Banner message="Esa toma no está en el plan activo." palette={aire} tone="warning" />
      </Screen>
    );
  }

  return (
    <Screen palette={aire}>
      <BackRow onBack={() => router.back()} palette={aire} subtitle={medication.dose} title={medication.name} />
      <Text style={styles.lead}>Horario {medication.schedule}. Recordatorio {medication.reminderEnabled ? 'activo' : 'apagado'}.</Text>
      <View style={styles.row}>
        <Text style={styles.lead}>Recordatorio</Text>
        <Switch
          onValueChange={(enabled) => {
            life.toggleReminder(medication.id, enabled);
            void refresh();
          }}
          value={medication.reminderEnabled}
        />
      </View>
      <Button
        label="Confirmar toma"
        onPress={() => {
          life.confirmDose(medication.id);
          const next = life.state.plan?.medications.find((item) => item.id === id);
          if (next?.reminderEnabled) {
            void scheduleMedicationReminder(next.name, `Recordatorio de ${next.dose}. Es un apoyo de bienestar, no una orden clínica.`, next.dueAt);
          }
          void refresh();
        }}
        palette={aire}
      />
      <Button
        label="Posponer 30 minutos"
        onPress={() => {
          life.postponeDose(medication.id);
          const next = life.state.plan?.medications.find((item) => item.id === id);
          if (next?.reminderEnabled) {
            void scheduleMedicationReminder(next.name, `Toma pospuesta de ${next.dose}.`, next.dueAt);
          }
          void refresh();
        }}
        palette={aire}
        tone="soft"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  title: { fontFamily: font.bold, fontSize: 28, color: aire.text },
  section: { fontFamily: font.semibold, fontSize: 18, color: aire.text },
  itemTitle: { fontFamily: font.semibold, fontSize: 16, color: aire.text },
  lead: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: aire.muted },
  card: { backgroundColor: aire.card, borderRadius: 16, padding: 16, gap: 8 },
  badge: { alignSelf: 'flex-start', backgroundColor: aire.accentSoft, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  badgeText: { fontFamily: font.semibold, fontSize: 12, color: '#00504C' },
  camera: { height: 220, borderRadius: 16, overflow: 'hidden', backgroundColor: '#000' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
