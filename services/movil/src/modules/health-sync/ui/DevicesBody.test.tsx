import { render, screen } from '@testing-library/react-native';
import { DevicesBody } from './DevicesBody';

describe('DevicesBody', () => {
  it('shows a visible alert when Health Connect permission is denied', async () => {
    await render(
      <DevicesBody
        lastRead={null}
        message="No concediste permisos de lectura en Health Connect."
        onConnect={() => undefined}
        onSync={() => undefined}
        pending={1}
        permission="denied"
        status={{ state: 'available', message: 'Health Connect está listo.' }}
        syncLabel="En el teléfono"
      />,
    );
    expect(screen.getByText(/No concediste permisos/)).toBeTruthy();
    expect(screen.getByText('1 pendientes de enviar')).toBeTruthy();
  });
});
