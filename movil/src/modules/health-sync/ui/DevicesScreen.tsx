import { useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { BackRow } from '../../../shared/ui/BackRow';
import { Screen } from '../../../shared/ui/Screen';
import { aire } from '../../../shared/theme/tokens';
import { syncStatusLabel } from '../domain/syncQueue';
import { useBand } from '../../band/BandProvider';
import { BandPairCard } from '../../band/ui/BandPairCard';
import { useLife } from '../../life/LifeProvider';
import { apiBaseUrl } from '../../../shared/api/lifeClient';
import { DevicesBody } from './DevicesBody';

export function DevicesScreen() {
  const router = useRouter();
  const { life, online, health, syncHealth, hasSession } = useLife();
  const { view: band, controller } = useBand();
  const [message, setMessage] = useState<string | null>(health.status.message);

  return (
    <Screen palette={aire}>
      <BackRow onBack={() => router.back()} palette={aire} subtitle="Conexión de sensores y almacenamiento local." title="Dispositivos y sincronización" />
      <View style={{ gap: 14 }}>
        {/* La banda Vitalsy es la fuente principal (RF-113); aquí solo se vincula, sus lecturas se ven en Hoy. */}
        <BandPairCard
          available={band.available}
          connection={band.connection}
          found={band.found}
          message={band.message}
          onForget={() => void controller.forget()}
          onPair={(found) => void controller.pair(found)}
          onScan={() => void controller.scan()}
          paired={band.paired}
        />
        <DevicesBody
          lastRead={life.state.lastLocalReadAt}
          message={message}
          onConnect={() => void syncHealth().then((next) => setMessage(next))}
          onSync={() => void syncHealth().then((next) => setMessage(next))}
          pending={life.pendingSyncCount()}
          permission={health.permission}
          status={health.status}
          syncLabel={syncStatusLabel(online, life.pendingSyncCount(), Boolean(apiBaseUrl()), life.state.lastServerSyncAt, hasSession)}
        />
      </View>
    </Screen>
  );
}
