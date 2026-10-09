import { StyleSheet, Text, View } from 'react-native';
import type { TodaySnapshot } from '../domain/today';
import { Banner } from '../../../shared/ui/Banner';
import { Button } from '../../../shared/ui/Button';
import { MetricCard } from '../../../shared/ui/MetricCard';
import { aire, font } from '../../../shared/theme/tokens';

export function TodayBody({
  name,
  dateLabel,
  snapshot,
  offline,
  syncLabel,
  onOpenNotices,
  onDismissNudge,
  onManual,
  onSync,
}: {
  name: string;
  dateLabel: string;
  snapshot: TodaySnapshot;
  offline: boolean;
  syncLabel: string;
  onOpenNotices: () => void;
  onDismissNudge: () => void;
  onManual: () => void;
  onSync: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.date}>{dateLabel}</Text>
      <Text style={styles.hello}>Hola, {name}</Text>
      <Text style={styles.lead}>
        Seguimiento respecto a tu línea de base personal. Información preventiva, no un diagnóstico.
      </Text>
      {offline ? <Banner message="Sin conexión. Tus lecturas siguen guardadas en el teléfono y se enviarán al volver la red." palette={aire} tone="warning" /> : null}
      <View style={styles.status}>
        <Text style={styles.kicker}>{syncLabel}</Text>
        <Text style={styles.headline}>{snapshot.empty ? 'Esperando tu primera lectura del día' : snapshot.headline}</Text>
        <Text style={styles.summary}>{snapshot.empty ? 'Conecta Health Connect o registra una lectura manual. No mostramos cifras de ejemplo.' : snapshot.summary}</Text>
      </View>
      {snapshot.metrics.length > 0 ? (
        <View style={styles.grid}>
          {snapshot.metrics.map((metric) => (
            <MetricCard footnote={metric.footnote} key={metric.kind} label={metric.label} palette={aire} unit={metric.unit} value={metric.valueLabel} />
          ))}
        </View>
      ) : (
        <Button label="Sincronizar Health Connect" onPress={onSync} palette={aire} />
      )}
      {snapshot.nudge ? (
        <View style={styles.nudge}>
          <Text style={styles.nudgeTitle}>{snapshot.nudge.title}</Text>
          <Text style={styles.summary}>{snapshot.nudge.body}</Text>
          <View style={styles.row}>
            <Button label="Ver avisos" onPress={onOpenNotices} palette={aire} />
            <Button label="Descartar" onPress={onDismissNudge} palette={aire} tone="soft" />
          </View>
        </View>
      ) : null}
      <Button label="Registrar lectura manual" onPress={onManual} palette={aire} tone="soft" />
      <Text style={styles.disclaimer}>Vitalsy Life es un acompañamiento de bienestar preventivo y no emite diagnósticos médicos.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  date: { fontFamily: font.semibold, fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase', color: aire.muted },
  hello: { fontFamily: font.bold, fontSize: 30, letterSpacing: -0.4, color: aire.text },
  lead: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: aire.muted },
  status: { backgroundColor: aire.card, borderRadius: 16, padding: 16, gap: 8 },
  kicker: { fontFamily: font.semibold, fontSize: 12, color: aire.accent },
  headline: { fontFamily: font.semibold, fontSize: 18, color: aire.text },
  summary: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: aire.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  nudge: { backgroundColor: '#D8FBF6', borderRadius: 16, padding: 14, gap: 8 },
  nudgeTitle: { fontFamily: font.semibold, fontSize: 14, color: '#00504C' },
  row: { gap: 8 },
  disclaimer: { fontFamily: font.regular, fontSize: 12, lineHeight: 16, textAlign: 'center', color: aire.muted },
});
