import { useRouter } from 'expo-router';
import { useState } from 'react';
import { BackRow } from '../../../shared/ui/BackRow';
import { Screen } from '../../../shared/ui/Screen';
import { aire } from '../../../shared/theme/tokens';
import { syncStatusLabel } from '../domain/syncQueue';
import { useLife } from '../../life/LifeProvider';
import { apiBaseUrl } from '../../../shared/api/lifeClient';
import { DevicesBody } from './DevicesBody';

export function DevicesScreen() {
  const router = useRouter();
  const { life, online, health, syncHealth } = useLife();
  const [message, setMessage] = useState<string | null>(health.status.message);

  return (
    <Screen palette={aire}>
      <BackRow onBack={() => router.back()} palette={aire} subtitle="Conexión de sensores y almacenamiento local." title="Dispositivos y sincronización" />
      <DevicesBody
        lastRead={life.state.lastLocalReadAt}
        message={message}
        onConnect={() => void syncHealth().then((next) => setMessage(next))}
        onSync={() => void syncHealth().then((next) => setMessage(next))}
        pending={life.pendingSyncCount()}
        permission={health.permission}
        status={health.status}
        syncLabel={syncStatusLabel(online, life.pendingSyncCount(), Boolean(apiBaseUrl()), life.state.lastServerSyncAt)}
      />
    </Screen>
  );
}
