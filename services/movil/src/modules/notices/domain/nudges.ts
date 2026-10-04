import type { MetricBaseline } from '../../health-sync/domain/baseline';

export type NoticeKind = 'habit' | 'deviation' | 'stability';

export type NoticeDraft = {
  id: string;
  kind: NoticeKind;
  title: string;
  body: string;
  createdAt: string;
  metric?: MetricBaseline['kind'];
};

function belowRange(metric: MetricBaseline | undefined): boolean {
  return Boolean(
    metric &&
      metric.status !== 'building' &&
      metric.latest !== null &&
      metric.low !== null &&
      metric.latest < metric.low,
  );
}

export function draftNudge(baselines: MetricBaseline[], now: Date): NoticeDraft | null {
  const byKind = new Map(baselines.map((item) => [item.kind, item]));
  const day = now.toISOString().slice(0, 10);
  const deviation = baselines.find((item) => item.status === 'sustained_deviation');

  if (deviation) {
    const lower = deviation.latest !== null && deviation.low !== null && deviation.latest < deviation.low;
    return {
      id: `deviation-${deviation.kind}-${day}`,
      kind: 'deviation',
      metric: deviation.kind,
      title: lower ? 'Un ritmo un poco más bajo de lo usual' : 'Un ritmo un poco más alto de lo usual',
      body: 'Llevas varias lecturas fuera de tu línea de base personal. Es una señal preventiva, no un diagnóstico. Si te sientes mal, contacta a tu servicio de salud.',
      createdAt: now.toISOString(),
    };
  }

  if (belowRange(byKind.get('steps'))) {
    return {
      id: `habit-steps-${day}`,
      kind: 'habit',
      metric: 'steps',
      title: 'Un paseo corto, a tu ritmo',
      body: 'Hoy vas por debajo de tu actividad habitual. Unos minutos de caminata suave pueden acercarte a tu ritmo de los últimos días.',
      createdAt: now.toISOString(),
    };
  }

  if (belowRange(byKind.get('sleep'))) {
    return {
      id: `habit-sleep-${day}`,
      kind: 'habit',
      metric: 'sleep',
      title: 'Descanso más breve que tu usual',
      body: 'Dormiste menos que tu línea de base. Una pausa sin pantallas esta noche puede ayudarte a recuperar tu ritmo.',
      createdAt: now.toISOString(),
    };
  }

  const ready = baselines.some((item) => item.status === 'within');
  if (!ready) {
    return null;
  }

  return {
    id: `habit-hydration-${day}`,
    kind: 'habit',
    title: 'Pausa de hidratación sugerida',
    body: 'Tus lecturas siguen dentro de tu línea de base. Un vaso de agua ayuda a sostener ese ritmo.',
    createdAt: now.toISOString(),
  };
}

export function caregiverText(notice: NoticeDraft, personName: string): string {
  return `Hola, soy ${personName}. Vitalsy Life registró un aviso preventivo: ${notice.title}. No es un diagnóstico. Si puedes, escríbeme.`;
}
