import { createHash } from 'crypto';
import { emptySnapshot, LifeApp } from './lifeApp';

const digest = (value: string) => createHash('sha256').update(value).digest('hex');

function app() {
  let tick = 0;
  return new LifeApp(emptySnapshot(), {
    now: () => new Date('2026-10-03T12:00:00.000Z'),
    random: () => `salt-${tick++}-abcd1234`,
    digest,
  });
}

describe('LifeApp', () => {
  it('opens a session after registration and closes it on logout', () => {
    const life = app();
    const created = life.register({ name: 'Elena', email: 'elena@correo.test', password: 'calma1234', confirm: 'calma1234' });
    expect(created.ok).toBe(true);
    expect(life.currentUser()?.name).toBe('Elena');
    life.logout();
    expect(life.currentUser()).toBeNull();
    expect(life.login('elena@correo.test', 'calma1234').ok).toBe(true);
  });

  it('refuses a linking code until sharing is on, then revokes it', () => {
    const life = app();
    expect(life.issueLinkingCode().ok).toBe(false);
    life.setSharing(true);
    const issued = life.issueLinkingCode();
    expect(issued.ok).toBe(true);
    life.revokeSharing();
    expect(life.state.consent.linkingCode).toBeNull();
    expect(life.state.consent.sharingEnabled).toBe(false);
  });

  it('keeps new readings pending when there is no server', () => {
    const life = app();
    life.addManual('heart_rate', '64');
    expect(life.today().empty).toBe(false);
    const decision = life.flushDecision(true, false);
    expect(decision.pendingReason).toBe('no_api');
    expect(life.pendingSyncCount()).toBe(1);
  });

  it('does not activate a plan from an opaque code without a server body', () => {
    const life = app();
    const result = life.activateDischarge('ALTA-2026-8841', null);
    expect(result.ok).toBe(false);
    expect(life.state.plan).toBeNull();
  });

  it('activates, confirms and postpones a dose from a QR payload', () => {
    const life = app();
    const result = life.activateDischarge(
      JSON.stringify({ medications: [{ name: 'Paracetamol', dose: '1 g', schedule: '08:00' }], homeCare: ['Reposo'] }),
      null,
    );
    expect(result.ok).toBe(true);
    life.confirmDose('med-1');
    expect(life.state.plan?.medications[0].status).toBe('taken');
    life.postponeDose('med-1');
    expect(life.state.plan?.medications[0].status).toBe('postponed');
  });
});
