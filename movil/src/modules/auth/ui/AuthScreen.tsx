import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../../shared/ui/Screen';
import { Wordmark } from '../../../shared/ui/Wordmark';
import { aire } from '../../../shared/theme/tokens';
import { useLife } from '../../life/LifeProvider';
import { loginAccount, registerCitizen, type AuthOutcome } from '../../life/sessionAuth';
import { AuthForm } from './AuthForm';

export function AuthScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string; mode?: string }>();
  const { life, refresh, client, tokenStore } = useLife();

  function goNext() {
    if (params.next === 'activar') {
      router.replace('/plan/activar');
      return;
    }
    router.replace('/hoy');
  }

  async function finish(outcome: AuthOutcome): Promise<AuthOutcome> {
    if (outcome.confirmation) {
      const { confirmation } = outcome;
      return { ...outcome, confirmation: { ...confirmation, confirm: async () => finish(await confirmation.confirm()) } };
    }
    if (Object.keys(outcome.errors).length === 0) {
      await refresh();
    }
    return outcome;
  }

  return (
    <Screen palette={aire}>
      <Wordmark />
      <AuthForm
        initialMode={params.mode === 'register' ? 'register' : 'login'}
        localOnly={!client}
        onDone={goNext}
        onLogin={async (email, password) => finish(await loginAccount({ life, client, tokenStore }, email, password))}
        onRegister={async (input) => finish(await registerCitizen({ life, client, tokenStore }, input))}
      />
    </Screen>
  );
}
