import { fireEvent, render, screen } from '@testing-library/react-native';
import { BandCard, type BandCardProps } from './BandCard';

function props(patch: Partial<BandCardProps> = {}): BandCardProps {
  return {
    available: true,
    paired: null,
    connection: 'idle',
    found: [],
    live: null,
    battery: null,
    message: null,
    onScan: jest.fn(),
    onPair: jest.fn(),
    onReconnect: jest.fn(),
    onForget: jest.fn(),
    onSwapChannels: jest.fn(),
    onLedTest: jest.fn(),
    ...patch,
  };
}

describe('BandCard', () => {
  it('offers to search for a band when none is paired', async () => {
    const onScan = jest.fn();
    await render(<BandCard {...props({ onScan })} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Buscar banda' }));
    expect(onScan).toHaveBeenCalled();
    expect(screen.getByText('Sin banda vinculada')).toBeTruthy();
  });

  it('lists found bands and pairs the chosen one', async () => {
    const onPair = jest.fn();
    await render(<BandCard {...props({ found: [{ id: 'A', name: 'Vitalsy-12EF', rssi: -60 }], onPair })} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Vincular Vitalsy-12EF' }));
    expect(onPair).toHaveBeenCalledWith({ id: 'A', name: 'Vitalsy-12EF', rssi: -60 });
  });

  it('shows the live reading and signal quality of a connected band', async () => {
    await render(
      <BandCard
        {...props({
          paired: { name: 'Vitalsy-12EF' },
          connection: 'connected',
          live: { phase: 'measuring', quality: 'good', bpm: 72, spo2: 98, pi: 2.35 },
          battery: 87,
        })}
      />,
    );
    expect(screen.getByText('Conectada · Vitalsy-12EF')).toBeTruthy();
    expect(screen.getByText('72 lpm')).toBeTruthy();
    expect(screen.getByText('98 %')).toBeTruthy();
    expect(screen.getByText('Señal buena')).toBeTruthy();
    expect(screen.getByText('Batería 87 %')).toBeTruthy();
  });

  it('asks to place the finger when the band reports no contact', async () => {
    await render(
      <BandCard {...props({ paired: { name: 'Vitalsy-12EF' }, connection: 'connected', live: { phase: 'no_finger', quality: null, bpm: null, spo2: null, pi: 0 } })} />,
    );
    expect(screen.getByText('Coloca el dedo sobre el sensor')).toBeTruthy();
    expect(screen.getAllByText('--')).toHaveLength(2);
  });

  it('lets a disconnected band reconnect or be forgotten', async () => {
    const onReconnect = jest.fn();
    const onForget = jest.fn();
    await render(<BandCard {...props({ paired: { name: 'Vitalsy-12EF' }, connection: 'disconnected', onReconnect, onForget })} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Reconectar' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Olvidar banda' }));
    expect(onReconnect).toHaveBeenCalled();
    expect(onForget).toHaveBeenCalled();
  });

  it('shows errors and successes as visible banners', async () => {
    await render(<BandCard {...props({ message: { tone: 'danger', text: 'Activa el Bluetooth para conectar la banda.' } })} />);
    expect(screen.getByText('Activa el Bluetooth para conectar la banda.')).toBeTruthy();
  });

  it('explains when Bluetooth is not available in this build', async () => {
    await render(<BandCard {...props({ available: false })} />);
    expect(screen.getByText(/development build/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Buscar banda' })).toBeNull();
  });

  it('disables actions while searching', async () => {
    await render(<BandCard {...props({ connection: 'scanning' })} />);
    expect(screen.getByRole('button', { name: 'Buscar banda' }).props.accessibilityState).toMatchObject({ busy: true });
  });
});
