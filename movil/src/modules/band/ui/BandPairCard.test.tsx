import { fireEvent, render, screen } from '@testing-library/react-native';
import { BandPairCard, type BandPairCardProps } from './BandPairCard';

function props(patch: Partial<BandPairCardProps> = {}): BandPairCardProps {
  return {
    available: true,
    paired: null,
    connection: 'idle',
    found: [],
    message: null,
    onScan: jest.fn(),
    onPair: jest.fn(),
    onForget: jest.fn(),
    ...patch,
  };
}

describe('BandPairCard', () => {
  it('offers to search for a band when none is paired', async () => {
    const onScan = jest.fn();
    await render(<BandPairCard {...props({ onScan })} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Buscar banda' }));
    expect(onScan).toHaveBeenCalled();
    expect(screen.getByText('Sin banda vinculada')).toBeTruthy();
  });

  it('asks for the 6-digit key shown on the band before pairing', async () => {
    await render(<BandPairCard {...props()} />);
    expect(screen.getByText(/Escribe la clave de 6 dígitos que aparece en tu banda/)).toBeTruthy();
  });

  it('does not repeat the key hint once paired', async () => {
    await render(<BandPairCard {...props({ paired: { name: 'Vitalsy-12EF' }, connection: 'connected' })} />);
    expect(screen.queryByText(/clave de 6 dígitos/)).toBeNull();
  });

  it('lists found bands and pairs the chosen one', async () => {
    const onPair = jest.fn();
    await render(<BandPairCard {...props({ found: [{ id: 'A', name: 'Vitalsy-12EF', rssi: -60 }], onPair })} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Vincular Vitalsy-12EF' }));
    expect(onPair).toHaveBeenCalledWith({ id: 'A', name: 'Vitalsy-12EF', rssi: -60 });
  });

  it('once paired it only shows the band and lets it be forgotten, with the readings left to Hoy', async () => {
    const onForget = jest.fn();
    await render(<BandPairCard {...props({ paired: { name: 'Vitalsy-12EF' }, connection: 'connected', onForget })} />);
    expect(screen.getByText('Conectada · Vitalsy-12EF')).toBeTruthy();
    expect(screen.getByText(/Verás sus lecturas en Hoy/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Buscar banda' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Probar LEDs' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'Olvidar banda' }));
    expect(onForget).toHaveBeenCalled();
  });

  it('shows pairing errors as visible banners', async () => {
    await render(<BandPairCard {...props({ message: { tone: 'danger', text: 'Activa el Bluetooth para conectar la banda.' } })} />);
    expect(screen.getByText('Activa el Bluetooth para conectar la banda.')).toBeTruthy();
  });

  it('keeps the post-pairing messages for Hoy', async () => {
    await render(<BandPairCard {...props({ paired: { name: 'Vitalsy-12EF' }, message: { tone: 'info', text: 'Banda vinculada.' } })} />);
    expect(screen.queryByText('Banda vinculada.')).toBeNull();
  });

  it('explains when Bluetooth is not available in this build', async () => {
    await render(<BandPairCard {...props({ available: false })} />);
    expect(screen.getByText(/development build/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Buscar banda' })).toBeNull();
  });

  it('disables actions while searching', async () => {
    await render(<BandPairCard {...props({ connection: 'scanning' })} />);
    expect(screen.getByRole('button', { name: 'Buscar banda' }).props.accessibilityState).toMatchObject({ busy: true });
  });
});
