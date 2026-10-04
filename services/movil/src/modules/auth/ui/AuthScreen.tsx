import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '../../../shared/ui/Screen';
import { Wordmark } from '../../../shared/ui/Wordmark';
import { aire } from '../../../shared/theme/tokens';
import { useLife } from '../../life/LifeProvider';
import { AuthForm } from './AuthForm';

export function AuthScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string; mode?: string }>();
  const { life, refresh } = useLife();

  function goNext() {
    if (params.next === 'activar') {
      router.replace('/plan/activar');
      return;
    }
    router.replace('/hoy');
  }

  return (
    <Screen palette={aire}>
      <Wordmark />
      <AuthForm
        initialMode={params.mode === 'register' ? 'register' : 'login'}
        onLogin={(email, password) => {
          const result = life.login(email, password);
          if (result.ok) {
            void refresh().then(goNext);
          }
          return result.errors;
        }}
        onRegister={(input) => {
          const result = life.register(input);
          if (result.ok) {
            void refresh().then(goNext);
          }
          return result.errors;
        }}
      />
    </Screen>
  );
}
