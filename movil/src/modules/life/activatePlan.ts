import type { LifeClient } from '../../shared/api/lifeClient';
import type { LifeApp } from './lifeApp';

export type ActivateResult = { ok: true } | { ok: false; message: string };

type Deps = {
  life: LifeApp;
  client: Pick<LifeClient, 'fetchDischargePlan'> | null;
  hasSession: boolean;
  onUnauthorized: () => Promise<void>;
};

const OFFLINE = 'Sin conexión. Conéctate para activar tu plan.';
const LOGIN = 'Inicia sesión para activar tu plan de seguimiento.';

export async function activatePlan(raw: string, { life, client, hasSession, onUnauthorized }: Deps): Promise<ActivateResult> {
  // Un QR con el JSON del plan se activa localmente, sin servidor ni sesión.
  const local = life.activateDischarge(raw, null);
  if (local.ok || !client) {
    return local;
  }
  if (!hasSession) {
    return { ok: false, message: LOGIN };
  }
  let plan: Awaited<ReturnType<LifeClient['fetchDischargePlan']>>;
  try {
    plan = await client.fetchDischargePlan(raw.trim());
  } catch {
    return { ok: false, message: OFFLINE };
  }
  if (plan.ok) {
    return life.activateDischarge(raw, plan.data);
  }
  if (plan.status === 0) {
    return { ok: false, message: OFFLINE };
  }
  if (plan.status === 401) {
    await onUnauthorized();
    return { ok: false, message: LOGIN };
  }
  if (plan.code === 'plan_not_found') {
    return { ok: false, message: 'No reconocemos ese código de alta. Revisa la hoja de alta.' };
  }
  if (plan.code === 'plan_claimed') {
    return { ok: false, message: 'Este plan ya fue activado en otra cuenta.' };
  }
  return { ok: false, message: 'No pudimos activar tu plan en este momento. Inténtalo más tarde.' };
}
