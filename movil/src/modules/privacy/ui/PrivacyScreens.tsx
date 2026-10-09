import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet, Switch, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { AppHeader } from '../../../shared/ui/AppHeader';
import { BackRow } from '../../../shared/ui/BackRow';
import { Banner } from '../../../shared/ui/Banner';
import { Button } from '../../../shared/ui/Button';
import { Screen } from '../../../shared/ui/Screen';
import { chalk, font } from '../../../shared/theme/tokens';
import { useLife } from '../../life/LifeProvider';

export function PrivacyScreen() {
  const router = useRouter();
  const { life, refresh } = useLife();
  const consent = life.state.consent;
  const [message, setMessage] = useState<string | null>(null);

  return (
    <Screen palette={chalk}>
      <AppHeader onProfilePress={() => router.push('/perfil')} palette={chalk} status={consent.sharingEnabled ? 'Compartir activo' : 'Solo tú'} />
      <Text style={styles.title}>Privacidad y soberanía</Text>
      <Text style={styles.lead}>Tus registros se cifran en el teléfono. Life no comparte métricas sin un consentimiento que puedes revocar.</Text>
      <View style={styles.row}>
        <Text style={styles.item}>Compartir con instituciones autorizadas</Text>
        <Switch
          onValueChange={(enabled) => {
            life.setSharing(enabled);
            setMessage(enabled ? 'La compartición quedó activa. El código se genera en el siguiente paso.' : 'La compartición quedó apagada y el código anterior ya no vale.');
            void refresh();
          }}
          value={consent.sharingEnabled}
        />
      </View>
      {message ? <Banner message={message} palette={chalk} /> : null}
      {consent.institutions.length === 0 ? (
        <Text style={styles.lead}>Ninguna institución tiene acceso ahora. Tu información permanece en tu teléfono.</Text>
      ) : (
        consent.institutions.map((item) => (
          <View key={item.id} style={styles.card}>
            <Text style={styles.item}>{item.name}</Text>
            <Text style={styles.lead}>Acceso vigente desde {item.grantedAt.slice(0, 10)}</Text>
          </View>
        ))
      )}
      <Button
        label="Generar código / QR de vinculación"
        onPress={() => {
          const result = life.issueLinkingCode();
          if (!result.ok) {
            setMessage(result.message);
            return;
          }
          void refresh();
          router.push('/privacidad/codigo');
        }}
        palette={chalk}
      />
      <Button
        label="Revocar todos los accesos"
        onPress={() => {
          life.revokeSharing();
          setMessage('Accesos revocados. El código de vinculación dejó de ser válido.');
          void refresh();
        }}
        palette={chalk}
        tone="ghost"
      />
    </Screen>
  );
}

export function LinkingCodeScreen() {
  const router = useRouter();
  const { life, refresh } = useLife();
  const code = life.state.consent.linkingCode;
  const [message, setMessage] = useState<string | null>(null);

  return (
    <Screen palette={chalk}>
      <BackRow onBack={() => router.back()} palette={chalk} subtitle="Muéstralo solo si quieres que admisión lo registre." title="Código para el hospital" />
      {!code ? (
        <Banner message="No hay un código vigente. Activa la compartición y genera uno." palette={chalk} tone="warning" />
      ) : (
        <View style={styles.card}>
          <QRCode backgroundColor="#FFFFFF" color="#1C242B" size={180} value={code} />
          <Text style={styles.code}>{code}</Text>
          <Button
            label="Compartir código"
            onPress={() => void Share.share({ message: `Código de vinculación Vitalsy Life: ${code}` })}
            palette={chalk}
            tone="soft"
          />
          <Button
            label="Generar otro código"
            onPress={() => {
              const result = life.issueLinkingCode();
              if (!result.ok) {
                setMessage(result.message);
                return;
              }
              setMessage('El código anterior dejó de mostrarse. Usa el nuevo.');
              void refresh();
            }}
            palette={chalk}
            tone="ghost"
          />
        </View>
      )}
      {message ? <Banner message={message} palette={chalk} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: font.bold, fontSize: 28, color: chalk.text },
  lead: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: chalk.muted },
  item: { fontFamily: font.semibold, fontSize: 14, color: chalk.text, flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  card: { backgroundColor: chalk.card, borderRadius: 16, borderWidth: 1, borderColor: chalk.border, padding: 16, gap: 12, alignItems: 'center' },
  code: { fontFamily: font.bold, fontSize: 22, letterSpacing: 1, color: chalk.text },
});
