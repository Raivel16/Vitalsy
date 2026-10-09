import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { BackRow } from '../../../shared/ui/BackRow';
import { Button } from '../../../shared/ui/Button';
import { Screen } from '../../../shared/ui/Screen';
import { chalk, font } from '../../../shared/theme/tokens';
import { caregiverText } from '../domain/nudges';
import { useLife } from '../../life/LifeProvider';

export function NoticesScreen() {
  const router = useRouter();
  const { life, refresh } = useLife();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const notices = life.visibleNotices().filter((notice) => filter === 'all' || !notice.readAt);
  const user = life.currentUser();

  return (
    <Screen palette={chalk}>
      <BackRow onBack={() => router.back()} palette={chalk} title="Avisos" />
      <View style={styles.filters}>
        <Button label="Todos" onPress={() => setFilter('all')} palette={chalk} tone={filter === 'all' ? 'primary' : 'ghost'} />
        <Button label="No leídos" onPress={() => setFilter('unread')} palette={chalk} tone={filter === 'unread' ? 'primary' : 'ghost'} />
      </View>
      {notices.length === 0 ? <Text style={styles.lead}>No hay avisos en este filtro. Aparecen cuando tu ritmo se compara con tu línea de base.</Text> : null}
      {notices.map((notice) => (
        <View key={notice.id} style={styles.card}>
          <Text style={styles.item}>{notice.title}</Text>
          <Text style={styles.lead}>{notice.body}</Text>
          <Text style={styles.meta}>{notice.readAt ? 'Leído' : 'Sin confirmar'}</Text>
          <Button
            label="Marcar leído"
            onPress={() => {
              life.markNoticeRead(notice.id);
              void refresh();
            }}
            palette={chalk}
          />
          <Button
            label="Posponer"
            onPress={() => {
              life.snoozeNotice(notice.id);
              void refresh();
            }}
            palette={chalk}
            tone="soft"
          />
          {notice.kind === 'deviation' && life.state.contact?.enabled ? (
            <Button
              label="Avisar a mi contacto"
              onPress={() => {
                const text = caregiverText(notice, user?.name ?? 'una persona');
                const phone = life.state.contact?.phone;
                life.markNoticeRead(notice.id);
                void refresh();
                if (phone) {
                  void Linking.openURL(`sms:${phone}?body=${encodeURIComponent(text)}`);
                }
              }}
              palette={chalk}
              tone="ghost"
            />
          ) : null}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', gap: 8 },
  card: { backgroundColor: chalk.card, borderRadius: 16, borderWidth: 1, borderColor: chalk.border, padding: 14, gap: 8 },
  item: { fontFamily: font.semibold, fontSize: 16, color: chalk.text },
  lead: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: chalk.muted },
  meta: { fontFamily: font.semibold, fontSize: 12, color: chalk.accent },
});
