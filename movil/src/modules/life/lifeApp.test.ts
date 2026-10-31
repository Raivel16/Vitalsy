import { createHash } from 'crypto';
import { syncStatusLabel } from '../health-sync/domain/syncQueue';
import { activeLinkingCode } from '../privacy/domain/consent';
import { emptySnapshot, LifeApp, type LifeSnapshot } from './lifeApp';

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
    const created = life.register({ name: 'Elena', email: 'elena@correo.test', password: 'calma12345', confirm: 'calma12345' });
    expect(created.ok).toBe(true);
    expect(life.currentUser()?.name).toBe('Elena');
    life.logout();
    expect(life.currentUser()).toBeNull();
    expect(life.login('elena@correo.test', 'calma12345').ok).toBe(true);
  });

  it('shows the band reading instead of a Health Connect one taken at the same moment, but keeps both stored', () => {
    const life = app();
    const at = '2026-10-03T11:58:00.000Z';
    const sample = (origin: 'health_connect' | 'vitalsy_band', value: number) => ({
      id: `${origin}-${value}`,
      kind: 'heart_rate' as const,
      value,
      unit: 'lpm',
      startedAt: at,
      endedAt: at,
      origin,
    });
    life.addSamples([sample('health_connect', 90), sample('vitalsy_band', 66)]);
    expect(life.state.samples).toHaveLength(2);
    expect(life.today().metrics.find((metric) => metric.kind === 'heart_rate')?.valueLabel).toBe('66');
    expect(life.displaySamples().map((item) => item.origin)).toEqual(['vitalsy_band']);
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
    const decision = life.flushDecision(true, false, true);
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
    life.toggleReminder('med-1', false);
    expect(life.state.plan?.medications[0].reminderEnabled).toBe(false);
  });

  it('ignores dose actions while there is no plan', () => {
    const life = app();
    life.confirmDose('med-1');
    life.postponeDose('med-1');
    life.toggleReminder('med-1', false);
    expect(life.state.plan).toBeNull();
  });

  it('reports registration and login errors without opening a session', () => {
    const life = app();
    const bad = life.register({ name: '', email: 'no-es-correo', password: '1', confirm: '2' });
    expect(bad.ok).toBe(false);
    expect(Object.keys(bad.errors).length).toBeGreaterThan(0);
    expect(life.currentUser()).toBeNull();
    const login = life.login('nadie@correo.test', 'incorrecta');
    expect(login.ok).toBe(false);
    expect(life.currentUser()).toBeNull();
  });

  it('adds each reading once and rejects invalid manual values', () => {
    const life = app();
    const sample = {
      id: 'h-1',
      kind: 'heart_rate' as const,
      value: 70,
      unit: 'lpm',
      startedAt: '2026-10-03T08:00:00.000Z',
      endedAt: '2026-10-03T08:00:00.000Z',
      origin: 'health_connect' as const,
    };
    expect(life.addSamples([sample])).toBe(1);
    expect(life.addSamples([sample])).toBe(0);
    expect(life.state.samples).toHaveLength(1);
    expect(life.addManual('heart_rate', '5')).toMatchObject({ ok: false });
    expect(life.state.samples).toHaveLength(1);
    expect(life.addManual('spo2', '98,5')).toEqual({ ok: true });
    expect(life.state.samples[1]).toMatchObject({ kind: 'spo2', value: 98.5, unit: '%' });
  });

  it('filters readings by date range and kind', () => {
    const life = app();
    life.addSamples([
      { id: 'a', kind: 'heart_rate', value: 60, unit: 'lpm', startedAt: '2026-10-01T08:00:00.000Z', endedAt: '2026-10-01T08:00:00.000Z', origin: 'manual' },
      { id: 'b', kind: 'spo2', value: 97, unit: '%', startedAt: '2026-10-02T08:00:00.000Z', endedAt: '2026-10-02T08:00:00.000Z', origin: 'manual' },
      { id: 'c', kind: 'heart_rate', value: 66, unit: 'lpm', startedAt: '2026-10-05T08:00:00.000Z', endedAt: '2026-10-05T08:00:00.000Z', origin: 'manual' },
    ]);
    const from = new Date('2026-10-01T00:00:00.000Z');
    const to = new Date('2026-10-03T00:00:00.000Z');
    expect(life.samplesBetween(from, to).map((sample) => sample.id)).toEqual(['a', 'b']);
    expect(life.samplesBetween(from, to, 'spo2').map((sample) => sample.id)).toEqual(['b']);
  });

  it('validates the emergency contact before saving it', () => {
    const life = app();
    const invalid = life.saveContact({ name: ' ', phone: '12', enabled: true });
    expect(invalid).toMatchObject({ ok: false });
    expect(life.state.contact).toBeNull();
    expect(life.saveContact({ name: ' Marta ', phone: '+51 999-888-777', enabled: true })).toEqual({ ok: true });
    expect(life.state.contact).toEqual({ name: 'Marta', phone: '51999888777', enabled: true });
  });

  it('grants an institution only while sharing with a linking code', () => {
    const life = app();
    life.grantInstitution('Clínica Norte');
    expect(life.state.consent.institutions).toHaveLength(0);
    life.setSharing(true);
    life.issueLinkingCode();
    life.grantInstitution(' Clínica Norte ');
    life.grantInstitution('Clínica Norte');
    expect(life.state.consent.institutions.map((item) => item.name)).toEqual(['Clínica Norte']);
  });

  it('marks, snoozes and dismisses notices', () => {
    const notice = (id: string) => ({
      id,
      kind: 'habit' as const,
      title: id,
      body: 'cuerpo',
      createdAt: '2026-10-03T08:00:00.000Z',
      readAt: null,
      snoozedUntil: null,
    });
    const life = new LifeApp(
      { ...emptySnapshot(), notices: [notice('n1'), notice('n2')] },
      { now: () => new Date('2026-10-03T12:00:00.000Z'), random: () => 'salt', digest },
    );
    life.markNoticeRead('n1');
    expect(life.state.notices[0].readAt).toBe('2026-10-03T12:00:00.000Z');
    life.snoozeNotice('n2');
    expect(life.visibleNotices().map((item) => item.id)).toEqual(['n1']);
    life.dismissNotice('n1');
    life.dismissNotice('n1');
    expect(life.state.notices.map((item) => item.id)).toEqual(['n2']);
    expect(life.state.dismissedNoticeIds).toEqual(['n1']);
  });

  it('keeps a revoke pending until the server confirms it and never queues consent items', () => {
    const life = app();
    life.confirmSharing();
    expect(life.state.consent.sharingEnabled).toBe(true);
    expect(life.state.consentRevokePending).toBe(false);
    life.revokeSharing(true);
    expect(life.state.consent.sharingEnabled).toBe(false);
    expect(life.state.consentRevokePending).toBe(true);
    expect(life.state.queue.some((item) => item.kind === 'consent')).toBe(false);
    life.confirmRevoke();
    expect(life.state.consentRevokePending).toBe(false);
  });

  it('stores the server code only while sharing is confirmed and not being revoked', () => {
    const life = app();
    const expiresAt = '2026-10-03T12:30:00.000Z';
    expect(life.setServerLinkCode('K7QX-93MP', expiresAt)).toBe(false);
    life.confirmSharing();
    expect(life.setServerLinkCode('K7QX-93MP', expiresAt)).toBe(true);
    expect(life.state.consent).toMatchObject({ linkingCode: 'K7QX-93MP', linkingExpiresAt: expiresAt });
    life.revokeSharing(true);
    expect(life.state.consent.linkingCode).toBeNull();
    expect(life.setServerLinkCode('K7QX-93MP', expiresAt)).toBe(false);
  });

  it('merges server notices deduplicating by id and keeping read state', () => {
    const life = app();
    const server = [
      { id: 's1', kind: 'habito' as const, title: 'Camina', body: 'Un paseo corto', metric: 'steps', createdAt: '2026-10-03T08:00:00.000Z' },
      { id: 's2', kind: 'preventivo' as const, title: 'Hidrátate', body: 'Toma agua', metric: null, createdAt: '2026-10-03T09:00:00.000Z' },
    ];
    expect(life.mergeServerNotices(server)).toBe(2);
    life.markNoticeRead('s1');
    expect(life.mergeServerNotices(server)).toBe(0);
    expect(life.state.notices.map((n) => n.id).sort()).toEqual(['s1', 's2']);
    expect(life.state.notices.find((n) => n.id === 's1')?.readAt).not.toBeNull();
    expect(life.state.notices.find((n) => n.id === 's1')?.kind).toBe('habit');
    expect(life.state.notices.find((n) => n.id === 's2')?.kind).toBe('stability');
    life.dismissNotice('s2');
    expect(life.mergeServerNotices(server)).toBe(0);
    expect(life.state.notices.map((n) => n.id)).toEqual(['s1']);
  });

  it('drops a legacy local linking code on load and never treats it as active', () => {
    const legacy = {
      ...emptySnapshot(),
      consent: {
        sharingEnabled: true,
        linkingCode: 'VL-ABCD-1234',
        linkingIssuedAt: '2026-10-01T10:00:00.000Z',
        revokedAt: null,
        institutions: [],
      },
      queue: [
        { id: 'consent-1', kind: 'consent' as const, body: '{}', status: 'pending' as const },
        { id: 'bio-1', kind: 'biometrics' as const, body: '[]', status: 'pending' as const },
      ],
    } as unknown as LifeSnapshot;
    const life = new LifeApp(legacy, { now: () => new Date('2026-10-03T12:00:00.000Z'), random: () => 'x', digest });
    expect(life.state.consent.linkingCode).toBeNull();
    expect(life.state.consent.sharingEnabled).toBe(true);
    expect(activeLinkingCode({ ...life.state.consent, linkingCode: 'VL-ABCD-1234' }, new Date('2026-10-03T12:00:00.000Z'))).toBeNull();
    expect(life.state.queue.map((item) => item.id)).toEqual(['bio-1']);
  });

  it('caps notices and dismissed ids keeping the most recent', () => {
    const notices = Array.from({ length: 250 }, (_, index) => ({
      id: `n${index}`,
      kind: 'habit' as const,
      title: 't',
      body: 'b',
      createdAt: '2026-10-03T08:00:00.000Z',
      readAt: null,
      snoozedUntil: null,
    }));
    const dismissedNoticeIds = Array.from({ length: 600 }, (_, index) => `d${index}`);
    const life = new LifeApp({ ...emptySnapshot(), notices, dismissedNoticeIds }, { now: () => new Date(), random: () => 'x', digest });
    expect(life.state.notices).toHaveLength(200);
    expect(life.state.notices[0].id).toBe('n0');
    expect(life.state.dismissedNoticeIds).toHaveLength(500);
    expect(life.state.dismissedNoticeIds[499]).toBe('d599');
  });

  it('marks only accepted items as synced and advances the server time', () => {
    const life = app();
    life.addManual('heart_rate', '64');
    const ids = life.state.queue.map((item) => item.id);
    expect(life.pendingSyncCount()).toBe(1);
    life.applySyncResult(ids, [], '2026-10-03T12:05:00.000Z');
    expect(life.pendingSyncCount()).toBe(0);
    expect(life.state.lastServerSyncAt).toBe('2026-10-03T12:05:00.000Z');
  });

  it('does not claim a server sync when nothing was accepted', () => {
    const life = app();
    life.addManual('heart_rate', '64');
    const ids = life.state.queue.map((item) => item.id);
    life.applySyncResult([], [], '2026-10-03T12:05:00.000Z');
    expect(life.state.lastServerSyncAt).toBeNull();
    expect(life.pendingSyncCount()).toBe(1);
    life.applySyncResult([], ids.map((id) => ({ id, reason: 'invalid' })), '2026-10-03T12:06:00.000Z');
    expect(life.state.lastServerSyncAt).toBeNull();
    expect(life.pendingSyncCount()).toBe(0);
    const label = syncStatusLabel(true, life.pendingSyncCount(), true, life.state.lastServerSyncAt);
    expect(label).not.toBe('Sincronizado');
  });
});
