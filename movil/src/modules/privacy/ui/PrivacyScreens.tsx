import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Share, StyleSheet, Switch, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { AppHeader } from '../../../shared/ui/AppHeader';
import { BackRow } from '../../../shared/ui/BackRow';
import { Banner } from '../../../shared/ui/Banner';
import { Button } from '../../../shared/ui/Button';
import { Screen } from '../../../shared/ui/Screen';
import { chalk, font } from '../../../shared/theme/tokens';
import { useLife } from '../../life/LifeProvider';
import { REVOKE_PENDING_MESSAGE } from '../../life/consentSync';
import { activeLinkingCode, linkCodeExpiryLabel } from '../domain/consent';

function toggleTone(result: { ok: boolean; status?: string }): 'info' | 'warning' | 'danger' {
  if (!result.ok) {
    return 'danger';
  }
  return result.status === 'pending' ? 'warning' : 'info';
}

export function PrivacyScreen() {
  const router = useRouter();
  const { life, changeSharing, issueLinkCode } = useLife();
  const consent = life.state.consent;
  const revokePending = life.state.consentRevokePending;
  const [message, setMessage] = useState<{ text: string; tone: 'info' | 'warning' | 'danger' } | null>(null);
  const [busy, setBusy] = useState<'toggle' | 'code' | 'revoke' | null>(null);

  async function toggle(enabled: boolean) {
    setBusy('toggle');
    try {
      const result = await changeSharing(enabled);
      setMessage({ text: result.message, tone: toggleTone(result) });
    } finally {
      setBusy(null);
    }
  }

  async function generate() {
    setBusy('code');
    try {
      const result = await issueLinkCode();
      if (!result.ok) {
        setMessage({ text: result.message, tone: 'danger' });
        return;
      }
      router.push('/privacidad/codigo');
    } finally {
      setBusy(null);
    }
  }

  async function revokeAll() {
    setBusy('revoke');
    try {
      const result = await changeSharing(false);
      setMessage({ text: result.message, tone: result.status === 'pending' ? 'warning' : 'info' });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen palette={chalk}>
      <AppHeader onProfilePress={() => router.push('/perfil')} palette={chalk} status={consent.sharingEnabled ? 'Compartir activo' : 'Solo tú'} />
      <Text style={styles.title}>Privacidad y soberanía</Text>
      <Text style={styles.lead}>Tus registros se cifran en el teléfono. Life no comparte métricas sin un consentimiento que puedes revocar.</Text>
      <View style={styles.row}>
        <Text style={styles.item}>Compartir con instituciones autorizadas</Text>
        <Switch
          accessibilityLabel="Compartir con instituciones autorizadas"
          disabled={busy !== null}
          onValueChange={(enabled) => void toggle(enabled)}
          value={consent.sharingEnabled}
        />
      </View>
      {revokePending ? <Banner message={`Compartición apagada en tu teléfono. ${REVOKE_PENDING_MESSAGE}`} palette={chalk} tone="warning" /> : null}
      {message ? <Banner message={message.text} palette={chalk} tone={message.tone} /> : null}
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
        disabled={busy !== null}
        label="Generar código / QR de vinculación"
        loading={busy === 'code'}
        onPress={() => void generate()}
        palette={chalk}
      />
      <Button
        disabled={busy !== null}
        label="Revocar todos los accesos"
        loading={busy === 'revoke'}
        onPress={() => void revokeAll()}
        palette={chalk}
        tone="ghost"
      />
    </Screen>
  );
}

export function LinkingCodeScreen() {
  const router = useRouter();
  const { life, issueLinkCode } = useLife();
  const [message, setMessage] = useState<{ text: string; tone: 'info' | 'warning' | 'danger' } | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const consent = life.state.consent;
  const code = consent.sharingEnabled && !life.state.consentRevokePending ? activeLinkingCode(consent, now) : null;

  // Cuenta regresiva: al vencer, el código deja de mostrarse.
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 15_000);
    return () => clearInterval(timer);
  }, []);

  const expired = Boolean(consent.linkingCode) && !code && consent.sharingEnabled;
  const remainingMinutes = consent.linkingExpiresAt ? Math.max(0, Math.ceil((Date.parse(consent.linkingExpiresAt) - now.getTime()) / 60_000)) : null;

  async function regenerate() {
    setBusy(true);
    try {
      const result = await issueLinkCode();
      if (!result.ok) {
        setMessage({ text: result.message, tone: 'danger' });
        return;
      }
      setNow(new Date());
      setMessage({ text: 'El código anterior dejó de mostrarse. Usa el nuevo.', tone: 'info' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen palette={chalk}>
      <BackRow onBack={() => router.back()} palette={chalk} subtitle="Muéstralo solo si quieres que admisión lo registre." title="Código para el hospital" />
      {!code ? (
        <>
          <Banner
            message={expired ? 'El código venció. Genera uno nuevo.' : 'No hay un código vigente. Activa la compartición y genera uno.'}
            palette={chalk}
            tone="warning"
          />
          {consent.sharingEnabled && !life.state.consentRevokePending ? (
            <Button label="Generar otro código" loading={busy} onPress={() => void regenerate()} palette={chalk} tone="soft" />
          ) : null}
        </>
      ) : (
        <View style={styles.card}>
          <QRCode backgroundColor="#FFFFFF" color="#1C242B" size={180} value={code} />
          <Text accessibilityLabel={`Código de vinculación ${code}`} style={styles.code}>
            {code}
          </Text>
          <Text style={styles.lead}>
            {linkCodeExpiryLabel(consent.linkingExpiresAt)}
            {remainingMinutes !== null ? ` · quedan ${remainingMinutes} min` : ''}
          </Text>
          <Button
            label="Compartir código"
            onPress={() => void Share.share({ message: `Código de vinculación Vitalsy Life: ${code}` })}
            palette={chalk}
            tone="soft"
          />
          <Button label="Generar otro código" loading={busy} onPress={() => void regenerate()} palette={chalk} tone="ghost" />
        </View>
      )}
      {message ? <Banner message={message.text} palette={chalk} tone={message.tone} /> : null}
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
