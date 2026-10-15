import type { TokenStore } from '../../shared/api/tokenStore';
import type { LifeApp } from './lifeApp';

/**
 * Al arrancar en primer plano, con la instantánea ya cargada:
 * - una marca de «cambio de cuenta en curso» que quedó de un cierre brusco se limpia (en ESTE runtime
 *   no hay ningún cambio en curso), para que la tarea en segundo plano no quede apagada hasta el próximo login;
 * - un token anterior al vínculo con la cuenta se vincula a la cuenta del servidor de la instantánea.
 *   Sin sesión de servidor en la instantánea queda sin vincular (la tarea no hace nada).
 */
export async function reconcileSessionStartup(deps: { life: LifeApp; tokenStore: TokenStore }): Promise<void> {
  const { life, tokenStore } = deps;
  if (life.sessionChanging) {
    return;
  }
  try {
    if (await tokenStore.isTransitioning()) {
      if (life.sessionChanging) {
        return;
      }
      await tokenStore.setTransition(false);
    }
    const binding = await tokenStore.getBinding();
    const sessionUserId = life.state.sessionUserId;
    if (binding && binding.accountId === null && sessionUserId && life.hasServerSession() && !life.sessionChanging) {
      await tokenStore.set(binding.token, sessionUserId);
    }
  } catch {
    // Mejor esfuerzo: sin esto la tarea en segundo plano simplemente no actúa.
  }
}
