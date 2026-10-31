import type { BandConnection, BandLive } from '../bandController';
import type { BandQuality } from '../domain/gatt';

/** Mismos textos que el monitor serie del firmware. */
const QUALITY_TEXT: Record<BandQuality, string> = {
  stabilizing: 'Estabilizando…',
  motion: 'Movimiento: quédate quieto',
  weak_signal: 'Señal débil: apoya mejor el dedo',
  unstable_rhythm: 'Ritmo inestable',
  searching: 'Buscando latidos…',
  good: 'Señal buena',
};

export const BAND_DISCLAIMER = 'Lecturas de bienestar de un sensor propio: no sirven para diagnóstico.';

export function signalText(live: BandLive): string {
  if (live.phase === 'no_finger') {
    return 'Coloca el dedo sobre el sensor';
  }
  if (live.phase === 'adjusting') {
    return 'Ajustando brillo…';
  }
  return live.quality ? QUALITY_TEXT[live.quality] : 'Midiendo…';
}

export function statusText(connection: BandConnection, name: string): string {
  switch (connection) {
    case 'connected':
      return `Conectada · ${name}`;
    case 'connecting':
      return `Conectando con ${name}…`;
    case 'disconnected':
      return `Desconectada · ${name}`;
    default:
      return name;
  }
}
