import { fireEvent, render, screen } from '@testing-library/react-native';
import { BandStatusLine, type BandStatusLineProps } from './BandStatusLine';

function props(patch: Partial<BandStatusLineProps> = {}): BandStatusLineProps {
  return {
    paired: { name: 'Vitalsy-12EF' },
    connection: 'connected',
    battery: null,
    message: null,
    onReconnect: jest.fn(),
    ...patch,
  };
}

describe('BandStatusLine', () => {
  it('is not shown without a paired band', async () => {
    await render(<BandStatusLine {...props({ paired: null })} />);
    expect(screen.queryByText(/Vitalsy Band/)).toBeNull();
  });

  it('says the band is the source while it is connected, with its battery', async () => {
    await render(<BandStatusLine {...props({ battery: 87 })} />);
    expect(screen.getByText('Vitalsy Band · Conectada · Batería 87 %')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Reconectar' })).toBeNull();
  });

  it('lets a disconnected band reconnect', async () => {
    const onReconnect = jest.fn();
    await render(<BandStatusLine {...props({ connection: 'disconnected', onReconnect })} />);
    expect(screen.getByText('Vitalsy Band · Desconectada')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: 'Reconectar' }));
    expect(onReconnect).toHaveBeenCalled();
  });

  it('shows messages as visible banners', async () => {
    await render(<BandStatusLine {...props({ connection: 'disconnected', message: { tone: 'danger', text: 'No se pudo conectar con la banda.' } })} />);
    expect(screen.getByText('No se pudo conectar con la banda.')).toBeTruthy();
  });
});
