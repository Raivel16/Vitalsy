import { fireEvent, render, screen } from '@testing-library/react-native';
import { BandTodayCard, type BandTodayCardProps } from './BandTodayCard';

function props(patch: Partial<BandTodayCardProps> = {}): BandTodayCardProps {
  return {
    paired: { name: 'Vitalsy-12EF' },
    connection: 'connected',
    live: null,
    battery: null,
    message: null,
    onReconnect: jest.fn(),
    onSwapChannels: jest.fn(),
    onLedTest: jest.fn(),
    ...patch,
  };
}

describe('BandTodayCard', () => {
  it('is not shown without a paired band', async () => {
    await render(<BandTodayCard {...props({ paired: null })} />);
    expect(screen.queryByText('Vitalsy Band')).toBeNull();
  });

  it('shows the live reading and signal quality of a connected band', async () => {
    await render(
      <BandTodayCard
        {...props({ live: { phase: 'measuring', quality: 'good', bpm: 72, spo2: 98, pi: 2.35 }, battery: 87 })}
      />,
    );
    expect(screen.getByText('Conectada · Vitalsy-12EF')).toBeTruthy();
    expect(screen.getByText('72 lpm')).toBeTruthy();
    expect(screen.getByText('98 %')).toBeTruthy();
    expect(screen.getByText('Señal buena')).toBeTruthy();
    expect(screen.getByText('Batería 87 %')).toBeTruthy();
  });

  it('asks to place the finger when the band reports no contact', async () => {
    await render(<BandTodayCard {...props({ live: { phase: 'no_finger', quality: null, bpm: null, spo2: null, pi: 0 } })} />);
    expect(screen.getByText('Coloca el dedo sobre el sensor')).toBeTruthy();
    expect(screen.getAllByText('--')).toHaveLength(2);
  });

  it('lets a disconnected band reconnect', async () => {
    const onReconnect = jest.fn();
    await render(<BandTodayCard {...props({ connection: 'disconnected', onReconnect })} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Reconectar' }));
    expect(onReconnect).toHaveBeenCalled();
  });

  it('offers the sensor checks only while connected', async () => {
    const onLedTest = jest.fn();
    const onSwapChannels = jest.fn();
    await render(<BandTodayCard {...props({ onLedTest, onSwapChannels })} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Probar LEDs' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Intercambiar rojo/IR' }));
    expect(onLedTest).toHaveBeenCalled();
    expect(onSwapChannels).toHaveBeenCalled();
  });

  it('shows messages as visible banners', async () => {
    await render(<BandTodayCard {...props({ message: { tone: 'info', text: 'Banda vinculada. Se guardaron 3 lecturas de la banda.' } })} />);
    expect(screen.getByText('Banda vinculada. Se guardaron 3 lecturas de la banda.')).toBeTruthy();
  });
});
