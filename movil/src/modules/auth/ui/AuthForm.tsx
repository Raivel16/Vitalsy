import { useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PASSWORD_RECOVERY_MESSAGE, type FieldErrors } from '../domain/auth';
import { Banner } from '../../../shared/ui/Banner';
import { Button } from '../../../shared/ui/Button';
import { Field } from '../../../shared/ui/Field';
import { aire, font } from '../../../shared/theme/tokens';

type Mode = 'login' | 'register';

export type Confirmation = {
  pendingCount: number;
  undeliveredRevoke?: boolean;
  confirm: () => Promise<AuthOutcome>;
  cancel: () => Promise<void>;
};

export type AuthOutcome = { errors: FieldErrors; notices?: string[]; confirmation?: Confirmation };

export const LOCAL_ONLY_BANNER = 'Cuenta solo en este teléfono';

function submitLabel(mode: Mode, loading: boolean): string {
  if (mode === 'login') {
    return loading ? 'Iniciando sesión…' : 'Iniciar sesión';
  }
  return loading ? 'Creando cuenta…' : 'Crear cuenta';
}

function ConfirmationView({
  confirmation,
  formError,
  loading,
  onConfirm,
  onCancel,
}: Readonly<{
  confirmation: Confirmation;
  formError?: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}>) {
  const count = confirmation.pendingCount;
  const subject = count === 1 ? 'lectura sin enviar' : 'lecturas sin enviar';
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Cambio de cuenta</Text>
      {count > 0 ? (
        <Banner
          message={`Hay ${count} ${subject} de la otra cuenta. Si continúas, se borrarán de este teléfono.`}
          palette={aire}
          tone="warning"
        />
      ) : null}
      {confirmation.undeliveredRevoke ? (
        <Banner
          message="Tu revocación aún no llegó al servidor. Se enviará cuando inicies sesión de nuevo con esa cuenta."
          palette={aire}
          tone="warning"
        />
      ) : null}
      {formError ? <Banner message={formError} palette={aire} tone="danger" /> : null}
      <Button label="Continuar y borrar" loading={loading} onPress={onConfirm} palette={aire} />
      <Button disabled={loading} label="Cancelar" onPress={onCancel} palette={aire} tone="ghost" />
    </View>
  );
}

function NoticesView({ notices, onDone }: Readonly<{ notices: string[]; onDone?: () => void }>) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Sesión iniciada</Text>
      {notices.map((notice) => (
        <Banner key={notice} message={notice} palette={aire} tone="warning" />
      ))}
      <Button label="Continuar" onPress={() => onDone?.()} palette={aire} />
    </View>
  );
}

function ModeSwitch({ mode, onChange }: Readonly<{ mode: Mode; onChange: (mode: Mode) => void }>) {
  return (
    <View style={styles.switch}>
      <Pressable accessibilityRole="button" onPress={() => onChange('login')} style={[styles.tab, mode === 'login' && styles.tabOn]}>
        <Text style={[styles.tabText, mode === 'login' && styles.tabTextOn]}>Entrar</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => onChange('register')} style={[styles.tab, mode === 'register' && styles.tabOn]}>
        <Text style={[styles.tabText, mode === 'register' && styles.tabTextOn]}>Registro</Text>
      </Pressable>
    </View>
  );
}

function classifyOutcome(outcome: AuthOutcome): 'confirm' | 'errors' | 'notices' | 'done' {
  if (outcome.confirmation) {
    return 'confirm';
  }
  if (Object.keys(outcome.errors).length > 0) {
    return 'errors';
  }
  return (outcome.notices?.length ?? 0) > 0 ? 'notices' : 'done';
}

export function AuthForm({
  onLogin,
  onRegister,
  onDone,
  localOnly = false,
  initialMode = 'login',
}: Readonly<{
  onLogin: (email: string, password: string) => AuthOutcome | Promise<AuthOutcome>;
  onRegister: (input: { name: string; email: string; password: string; confirm: string }) => AuthOutcome | Promise<AuthOutcome>;
  /** Se llama al terminar con éxito (tras mostrar los avisos, si los hay). */
  onDone?: () => void;
  /** Sin servidor configurado: la cuenta vive solo en este teléfono. */
  localOnly?: boolean;
  initialMode?: Mode;
}>) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [recovery, setRecovery] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notices, setNotices] = useState<string[]>([]);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const busy = useRef(false);

  function submitCredentials(): AuthOutcome | Promise<AuthOutcome> {
    if (mode === 'login') {
      return onLogin(email, password);
    }
    return onRegister({ name, email, password, confirm });
  }

  async function submit(action?: () => Promise<AuthOutcome>) {
    if (busy.current) {
      return;
    }
    busy.current = true;
    setLoading(true);
    setErrors({});
    try {
      const outcome = await (action ?? submitCredentials)();
      setErrors(outcome.errors);
      setConfirmation(outcome.confirmation ?? null);
      const settled = classifyOutcome(outcome);
      if (settled === 'notices') {
        setNotices(outcome.notices ?? []);
      } else if (settled === 'done') {
        onDone?.();
      }
    } catch {
      setErrors({ form: 'No pudimos completar la solicitud. Inténtalo de nuevo.' });
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }

  if (confirmation) {
    const pending = confirmation;
    return (
      <ConfirmationView
        confirmation={pending}
        formError={errors.form}
        loading={loading}
        onCancel={() => {
          setConfirmation(null);
          setPassword('');
          void pending.cancel();
        }}
        onConfirm={() => void submit(pending.confirm)}
      />
    );
  }

  if (notices.length > 0) {
    return <NoticesView notices={notices} onDone={onDone} />;
  }

  let extra: ReactNode = null;
  if (mode === 'register') {
    extra = <Field error={errors.confirm} label="Confirmar contraseña" onChangeText={setConfirm} palette={aire} revealable value={confirm} />;
  } else if (localOnly) {
    extra = (
      <Pressable accessibilityRole="button" onPress={() => setRecovery(true)}>
        <Text style={styles.link}>¿Olvidaste tu contraseña?</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Tu ritmo, en calma</Text>
      <Text style={styles.lead}>Información preventiva sobre tu línea de base. No es un diagnóstico.</Text>
      {localOnly ? <Banner message={LOCAL_ONLY_BANNER} palette={aire} tone="info" /> : null}
      <ModeSwitch mode={mode} onChange={setMode} />
      {mode === 'register' ? <Field autoCapitalize="words" error={errors.name} label="Nombre" onChangeText={setName} palette={aire} value={name} /> : null}
      <Field error={errors.email} keyboardType="email-address" label="Correo" onChangeText={setEmail} palette={aire} value={email} />
      <Field error={errors.password} label="Contraseña" onChangeText={setPassword} palette={aire} revealable value={password} />
      {extra}
      {localOnly && recovery ? <Banner message={PASSWORD_RECOVERY_MESSAGE} palette={aire} tone="warning" /> : null}
      {errors.form ? <Banner message={errors.form} palette={aire} tone="danger" /> : null}
      <Button label={submitLabel(mode, loading)} loading={loading} onPress={() => void submit()} palette={aire} />
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
