import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Polyline, Rect } from 'react-native-svg';
import { AppHeader } from '../../../shared/ui/AppHeader';
import { Button } from '../../../shared/ui/Button';
import { Screen } from '../../../shared/ui/Screen';
import { aire, font } from '../../../shared/theme/tokens';
import { baselineForKind } from '../../health-sync/domain/baseline';
import { useLife } from '../../life/LifeProvider';
import { useRouter } from 'expo-router';

const RANGES = [
  { id: 'hoy', label: 'Hoy', days: 1 },
  { id: '7d', label: '7 días', days: 7 },
  { id: '30d', label: '30 días', days: 30 },
] as const;

export function TrendsScreen() {
  const router = useRouter();
  const { life } = useLife();
  const [range, setRange] = useState<(typeof RANGES)[number]['id']>('7d');
  const selected = RANGES.find((item) => item.id === range) ?? RANGES[1];
  const points = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - selected.days * 24 * 60 * 60 * 1000);
    return life
      .samplesBetween(from, to, 'heart_rate')
      .sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt));
  }, [life, selected.days, life.state.samples]);
  const baseline = baselineForKind(life.displaySamples(), 'heart_rate', new Date());
  const path = chartPath(points.map((item) => item.value));

  return (
    <Screen palette={aire}>
      <AppHeader onProfilePress={() => router.push('/perfil')} palette={aire} status="Tendencias" />
      <Text style={styles.title}>Tendencias</Text>
      <Text style={styles.lead}>La banda corresponde a tu línea de base personal, no a un umbral clínico.</Text>
      <View style={styles.filters}>
        {RANGES.map((item) => (
          <Button key={item.id} label={item.label} onPress={() => setRange(item.id)} palette={aire} tone={range === item.id ? 'primary' : 'soft'} />
        ))}
      </View>
      <View style={styles.card}>
        {points.length === 0 ? (
          <Text style={styles.lead}>No hay pulso en este periodo. Cuando Health Connect o una lectura manual lo registren, aparecerá aquí.</Text>
        ) : (
          <Svg height="140" width="100%" viewBox="0 0 320 140">
            <Rect fill="#ECF4FE" height="140" rx="16" width="320" />
            <Polyline fill="none" points={path} stroke="#006765" strokeLinecap="round" strokeWidth="3" />
          </Svg>
        )}
        <Text style={styles.meta}>
          {baseline.low === null || baseline.high === null
            ? 'Línea de base en construcción. Hacen falta 7 días de historia, sin contar las 3 lecturas más recientes.'
            : `Tu rango usual de pulso: ${Math.round(baseline.low)}–${Math.round(baseline.high)} lpm.`}
        </Text>
      </View>
    </Screen>
  );
}

function chartPath(values: number[]): string {
  if (values.length === 0) {
    return '';
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(1, max - min);
  return values
    .map((value, index) => {
      const x = values.length === 1 ? 160 : (index / (values.length - 1)) * 300 + 10;
      const y = 120 - ((value - min) / span) * 100;
      return `${x},${y}`;
    })
    .join(' ');
}

const styles = StyleSheet.create({
  title: { fontFamily: font.bold, fontSize: 28, color: aire.text },
  lead: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: aire.muted },
  filters: { gap: 8 },
  card: { backgroundColor: aire.card, borderRadius: 16, padding: 16, gap: 12 },
  meta: { fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: aire.text },
});
