import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '../../../shared/ui/AppHeader';
import { BackRow } from '../../../shared/ui/BackRow';
import { Banner } from '../../../shared/ui/Banner';
import { Button } from '../../../shared/ui/Button';
import { Field } from '../../../shared/ui/Field';
import { Screen } from '../../../shared/ui/Screen';
import { chalk, font } from '../../../shared/theme/tokens';
import { useLife } from '../../life/LifeProvider';
import { logoutSession } from '../../life/sessionAuth';

export function ProfileScreen() {
  const router = useRouter();
  const { life, refresh, client, tokenStore } = useLife();
  const [signingOut, setSigningOut] = useState(false);
  const user = life.currentUser();
  const contact = life.state.contact;
  const baseline = life.today();

  return (
    <Screen palette={chalk}>
      <AppHeader palette={chalk} status="Perfil" />
      <Text style={styles.title}>Perfil</Text>
      <Text style={styles.name}>{user?.name ?? 'Cuenta local'}</Text>
      <Text style={styles.lead}>{user?.email}</Text>
      <View style={styles.card}>
        <Text style={styles.item}>{contact ? contact.name : 'Sin contacto de emergencia'}</Text>
        <Text style={styles.lead}>{contact ? 'Recibirá aviso solo si tu ritmo se aleja de forma prolongada.' : 'Puedes agregar un familiar o cuidador.'}</Text>
        {contact ? (
          <Pressable onPress={() => void Linking.openURL(`tel:${contact.phone}`)}>
            <Text style={styles.link}>Llamar</Text>
          </Pressable>
        ) : null}
      </View>
      {[
        { label: 'Dispositivos y sincronización', hint: 'Health Connect y cola local', href: '/perfil/dispositivos' },
        { label: 'Preferencias de avisos', hint: 'Hábitos y desviaciones preventivas', href: '/hoy/avisos' },
        { label: 'Calibración de línea de base', hint: baseline.status === 'building' ? 'En construcción' : 'Ventana de 14 días', href: '/tendencias' },
        { label: 'Contacto de emergencia', hint: 'Aviso al cuidador', href: '/perfil/contacto' },
      ].map((row) => (
        <Pressable key={row.href} onPress={() => router.push(row.href as never)} style={styles.row}>
          <View>
            <Text style={styles.item}>{row.label}</Text>
            <Text style={styles.lead}>{row.hint}</Text>
          </View>
          <Text style={styles.link}>›</Text>
        </Pressable>
      ))}
      <Button
        label="Cerrar sesión"
        loading={signingOut}
        onPress={() => {
          if (signingOut) {
            return;
          }
          setSigningOut(true);
          void logoutSession({ life, client, tokenStore })
            .then(() => refresh())
            .then(() => router.replace('/'))
            .finally(() => setSigningOut(false));
        }}
        palette={chalk}
        tone="ghost"
      />
      <Text style={styles.lead}>Vitalsy Life. Bienestar preventivo personal. No es un diagnóstico clínico.</Text>
    </Screen>
  );
}

export function ContactScreen() {
  const router = useRouter();
  const { life, refresh } = useLife();
  const current = life.state.contact;
  const [name, setName] = useState(current?.name ?? '');
  const [phone, setPhone] = useState(current?.phone ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  return (
    <Screen palette={chalk}>
      <BackRow onBack={() => router.back()} palette={chalk} subtitle="El aviso no se envía solo en segundo plano. Preparamos el mensaje para que lo confirmes." title="Contacto de emergencia" />
      <Field autoCapitalize="words" error={errors.name} label="Nombre" onChangeText={setName} palette={chalk} value={name} />
      <Field error={errors.phone} keyboardType="phone-pad" label="Teléfono" onChangeText={(value) => setPhone(value.replace(/[^\d+\s-]/g, ''))} palette={chalk} value={phone} />
      {saved ? <Banner message="Contacto guardado en el teléfono." palette={chalk} /> : null}
      <Button
        label="Guardar contacto"
        onPress={() => {
          const result = life.saveContact({ name, phone, enabled: true });
          if (!result.ok) {
            setErrors(result.errors);
            setSaved(false);
            return;
          }
          setErrors({});
          setSaved(true);
          void refresh();
        }}
        palette={chalk}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: font.bold, fontSize: 28, color: chalk.text },
  name: { fontFamily: font.semibold, fontSize: 18, color: chalk.text },
  lead: { fontFamily: font.regular, fontSize: 13, lineHeight: 18, color: chalk.muted },
  item: { fontFamily: font.semibold, fontSize: 14, color: chalk.text },
  card: { backgroundColor: chalk.card, borderRadius: 16, borderWidth: 1, borderColor: chalk.border, padding: 14, gap: 6 },
  row: { backgroundColor: chalk.card, borderRadius: 16, borderWidth: 1, borderColor: chalk.border, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  link: { fontFamily: font.semibold, color: chalk.accent, fontSize: 14 },
});
