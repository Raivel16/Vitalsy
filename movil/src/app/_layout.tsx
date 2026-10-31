import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BandProvider } from '../modules/band/BandProvider';
import '../modules/health-sync/backgroundTask';
import { LifeProvider, useLife } from '../modules/life/LifeProvider';
import { aire } from '../shared/theme/tokens';

function Gate() {
  const { ready, life } = useLife();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (!ready) {
      return;
    }
    const root = segments[0];
    const open = root === undefined || root === 'auth';
    const authed = Boolean(life.currentUser());
    if (!authed && !open) {
      router.replace('/');
    } else if (authed && open) {
      router.replace('/hoy');
    }
  }, [ready, life, segments, router]);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: aire.canvas }}>
        <ActivityIndicator color={aire.accent} />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
  });

  if (!loaded && !error) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <LifeProvider>
        <BandProvider>
          <Gate />
        </BandProvider>
      </LifeProvider>
    </SafeAreaProvider>
  );
}
