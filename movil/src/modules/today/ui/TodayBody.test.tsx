import { render, screen } from '@testing-library/react-native';
import { TodayBody } from './TodayBody';

const empty = {
  empty: true,
  status: 'building' as const,
  headline: 'Estamos conociendo tu ritmo',
  summary: 'Hacen falta unos días de lecturas.',
  metrics: [],
  nudge: null,
  updatedAt: null,
};

describe('TodayBody', () => {
  it('shows the empty state instead of sample vitals', async () => {
    await render(
      <TodayBody
        dateLabel="sábado, 3 de octubre"
        name="Elena"
        offline={false}
        onDismissNudge={() => undefined}
        onManual={() => undefined}
        onOpenNotices={() => undefined}
        onSync={() => undefined}
        snapshot={empty}
        syncLabel="En el teléfono"
      />,
    );
    expect(screen.getByText('Esperando tu primera lectura del día')).toBeTruthy();
    expect(screen.queryByText('64')).toBeNull();
  });

  it('shows an offline banner without hiding the local reading', async () => {
    await render(
      <TodayBody
        dateLabel="sábado, 3 de octubre"
        name="Elena"
        offline
        onDismissNudge={() => undefined}
        onManual={() => undefined}
        onOpenNotices={() => undefined}
        onSync={() => undefined}
        snapshot={{
          ...empty,
          empty: false,
          metrics: [{ kind: 'heart_rate', label: 'Pulso', valueLabel: '64', unit: 'lpm', footnote: 'Línea de base en construcción' }],
        }}
        syncLabel="Sin conexión"
      />,
    );
    expect(screen.getByText(/siguen guardadas en el teléfono/)).toBeTruthy();
    expect(screen.getByText('64')).toBeTruthy();
  });
});
