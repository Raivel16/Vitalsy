import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PASSWORD_RECOVERY_MESSAGE, type FieldErrors } from '../domain/auth';
import { Banner } from '../../../shared/ui/Banner';
import { Button } from '../../../shared/ui/Button';
import { Field } from '../../../shared/ui/Field';
import { aire, font } from '../../../shared/theme/tokens';

type Mode = 'login' | 'register';

export function AuthForm({
  onLogin,
  onRegister,
  initialMode = 'login',
}: {
  onLogin: (email: string, password: string) => FieldErrors | Promise<FieldErrors>;
  onRegister: (input: { name: string; email: string; password: string; confirm: string }) => FieldErrors | Promise<FieldErrors>;
  initialMode?: Mode;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [recovery, setRecovery] = useState(false);

  function submit() {
    const pending = mode === 'login' ? onLogin(email, password) : onRegister({ name, email, password, confirm });
    if (pending instanceof Promise) {
      void pending.then(setErrors);
      return;
    }
    setErrors(pending);
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Tu ritmo, en calma</Text>
      <Text style={styles.lead}>Información preventiva sobre tu línea de base. No es un diagnóstico.</Text>
      <View style={styles.switch}>
        <Pressable onPress={() => setMode('login')} style={[styles.tab, mode === 'login' && styles.tabOn]}>
          <Text style={[styles.tabText, mode === 'login' && styles.tabTextOn]}>Entrar</Text>
        </Pressable>
        <Pressable onPress={() => setMode('register')} style={[styles.tab, mode === 'register' && styles.tabOn]}>
          <Text style={[styles.tabText, mode === 'register' && styles.tabTextOn]}>Registro</Text>
        </Pressable>
      </View>
      {mode === 'register' ? <Field autoCapitalize="words" error={errors.name} label="Nombre" onChangeText={setName} palette={aire} value={name} /> : null}
      <Field error={errors.email} keyboardType="email-address" label="Correo" onChangeText={setEmail} palette={aire} value={email} />
      <Field error={errors.password} label="Contraseña" onChangeText={setPassword} palette={aire} revealable value={password} />
      {mode === 'register' ? (
        <Field error={errors.confirm} label="Confirmar contraseña" onChangeText={setConfirm} palette={aire} revealable value={confirm} />
      ) : (
        <Pressable onPress={() => setRecovery(true)}>
          <Text style={styles.link}>¿Olvidaste tu contraseña?</Text>
        </Pressable>
      )}
      {recovery ? <Banner message={PASSWORD_RECOVERY_MESSAGE} palette={aire} tone="warning" /> : null}
      {errors.form ? <Banner message={errors.form} palette={aire} tone="danger" /> : null}
      <Button label={mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'} onPress={submit} palette={aire} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  title: { fontFamily: font.semibold, fontSize: 28, color: aire.text, letterSpacing: -0.4 },
  lead: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: aire.muted },
  switch: { flexDirection: 'row', backgroundColor: aire.soft, borderRadius: 999, padding: 4 },
  tab: { flex: 1, minHeight: 40, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  tabOn: { backgroundColor: aire.card },
  tabText: { fontFamily: font.semibold, color: aire.muted, fontSize: 14 },
  tabTextOn: { color: aire.accent },
  link: { fontFamily: font.semibold, color: aire.accent, fontSize: 12 },
});
