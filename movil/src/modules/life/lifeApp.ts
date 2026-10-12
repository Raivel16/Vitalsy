import { authenticate, registerAccount, type Account, type Digest, type FieldErrors } from '../auth/domain/auth';
import { buildBaselines } from '../health-sync/domain/baseline';
import { applySyncResult, decideFlush, enqueueSync, pendingCount, type SyncItem } from '../health-sync/domain/syncQueue';
import type { BiometricSample } from '../health-sync/domain/types';
import { draftNudge } from '../notices/domain/nudges';
import { confirmDose, postponeDose, resolveDischarge, toggleReminder, type FollowUpPlan } from '../plan/domain/plan';
import { CLOSED_CONSENT, grantInstitution, issueLinkingCode, revokeAll, setSharing, type ConsentState } from '../privacy/domain/consent';
import { normalizeContact, validateContact, type EmergencyContact } from '../profile/domain/contact';
import { buildToday, validateManual, type TodaySnapshot } from '../today/domain/today';

export type Notice = {
  id: string;
  kind: 'habit' | 'deviation' | 'stability';
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
  snoozedUntil: string | null;
};

export type LifeSnapshot = {
  accounts: Account[];
  sessionUserId: string | null;
  samples: BiometricSample[];
  queue: SyncItem[];
  consent: ConsentState;
  plan: FollowUpPlan | null;
  notices: Notice[];
  contact: EmergencyContact | null;
  lastLocalReadAt: string | null;
  lastServerSyncAt: string | null;
  dismissedNoticeIds: string[];
};

function isServerAccount(account: Account): boolean {
  return account.origin === 'server' || (!account.passwordHash && !account.salt);
}

export function emptySnapshot(): LifeSnapshot {
  return {
    accounts: [],
    sessionUserId: null,
    samples: [],
    queue: [],
    consent: CLOSED_CONSENT,
    plan: null,
    notices: [],
    contact: null,
    lastLocalReadAt: null,
    lastServerSyncAt: null,
    dismissedNoticeIds: [],
  };
}

type Clock = {
  now: () => Date;
  random: () => string;
  digest: Digest;
};

export class LifeApp {
  private snapshot: LifeSnapshot;

  constructor(
    snapshot: LifeSnapshot,
    private clock: Clock,
  ) {
    this.snapshot = { ...emptySnapshot(), ...snapshot, dismissedNoticeIds: snapshot.dismissedNoticeIds ?? [] };
  }

  get state(): LifeSnapshot {
    return this.snapshot;
  }

  currentUser(): Account | null {
    return this.snapshot.accounts.find((account) => account.id === this.snapshot.sessionUserId) ?? null;
  }

  register(input: { name: string; email: string; password: string; confirm: string }): { ok: boolean; errors: FieldErrors } {
    const result = registerAccount(this.snapshot.accounts, input, this.clock.random(), this.clock.digest);
    if (!result.account) {
      return { ok: false, errors: result.errors };
    }
    this.snapshot = { ...this.snapshot, accounts: result.accounts, sessionUserId: result.account.id };
    return { ok: true, errors: {} };
  }

  login(email: string, password: string): { ok: boolean; errors: FieldErrors } {
    const result = authenticate(this.snapshot.accounts, email, password, this.clock.digest);
    if (!result.account) {
      return { ok: false, errors: result.errors };
    }
    this.snapshot = { ...this.snapshot, sessionUserId: result.account.id };
    return { ok: true, errors: {} };
  }

  /**
   * Abre la sesión de una cuenta del servidor. No se guarda contraseña ni hash.
   * - Cuenta previa local (o ninguna): los datos locales se adoptan para la cuenta del servidor.
   * - Cuenta previa del servidor con otro id: los datos locales se descartan, y si hay lecturas
   *   sin enviar se pide confirmación antes (no se modifica nada hasta `confirmed`).
   */
  openServerSession(
    account: { id: number | string; name: string; email: string },
    options: { confirmed?: boolean } = {},
  ): { status: 'ok'; switched: boolean } | { status: 'needs_confirmation'; pendingCount: number } {
    const id = String(account.id);
    const previous = this.snapshot.accounts.find((existing) => isServerAccount(existing));
    const switched = Boolean(previous && previous.id !== id);
    const unsent = pendingCount(this.snapshot.queue);
    if (switched && unsent > 0 && !options.confirmed) {
      return { status: 'needs_confirmation', pendingCount: unsent };
    }
    const base = switched ? emptySnapshot() : this.snapshot;
    this.snapshot = {
      ...base,
      accounts: [{ id, name: account.name, email: account.email.trim().toLowerCase(), origin: 'server' }],
      sessionUserId: id,
    };
    return { status: 'ok', switched };
  }

  logout(): void {
    this.snapshot = { ...this.snapshot, sessionUserId: null };
  }

  addSamples(samples: BiometricSample[]): number {
    const known = new Set(this.snapshot.samples.map((sample) => sample.id));
    const fresh = samples.filter((sample) => !known.has(sample.id));
    if (fresh.length === 0) {
      return 0;
    }
    const queue = enqueueSync(this.snapshot.queue, {
      id: `bio-${this.clock.now().getTime()}-${fresh[0].id}`,
      kind: 'biometrics',
      body: JSON.stringify(fresh),
    });
    this.snapshot = {
      ...this.snapshot,
      samples: [...this.snapshot.samples, ...fresh],
      queue,
      lastLocalReadAt: this.clock.now().toISOString(),
    };
    this.captureNudge();
    return fresh.length;
  }

  addManual(kind: 'heart_rate' | 'spo2', raw: string): { ok: true } | { ok: false; message: string } {
    const message = validateManual(kind, raw);
    if (message) {
      return { ok: false, message };
    }
    const now = this.clock.now().toISOString();
    const value = Number(raw.replace(',', '.'));
    this.addSamples([
      {
        id: `manual-${kind}-${now}`,
        kind,
        value,
        unit: kind === 'spo2' ? '%' : 'lpm',
        startedAt: now,
        endedAt: now,
        origin: 'manual',
      },
    ]);
    return { ok: true };
  }

  today(): TodaySnapshot {
    const view = buildToday(this.snapshot.samples, this.clock.now());
    if (view.nudge && this.snapshot.dismissedNoticeIds.includes(view.nudge.id)) {
      return { ...view, nudge: null };
    }
    return view;
  }

  setSharing(enabled: boolean): void {
    const consent = setSharing(this.snapshot.consent, enabled, this.clock.now());
    this.snapshot = { ...this.snapshot, consent };
    this.enqueueConsent();
  }

  issueLinkingCode(): { ok: true; code: string } | { ok: false; message: string } {
    const result = issueLinkingCode(this.snapshot.consent, this.clock.now(), this.clock.random());
    this.snapshot = { ...this.snapshot, consent: result.state };
    if (!result.code) {
      return { ok: false, message: result.message ?? 'No se pudo generar el código.' };
    }
    this.enqueueConsent();
    return { ok: true, code: result.code };
  }

  revokeSharing(): void {
    this.snapshot = { ...this.snapshot, consent: revokeAll(this.snapshot.consent, this.clock.now()) };
    this.enqueueConsent();
  }

  grantInstitution(name: string): void {
    this.snapshot = { ...this.snapshot, consent: grantInstitution(this.snapshot.consent, name, this.clock.now()) };
  }

  activateDischarge(raw: string, remoteBody: string | null): { ok: true } | { ok: false; message: string } {
    const result = resolveDischarge(raw, this.clock.now(), remoteBody);
    if (!result.ok) {
      return result;
    }
    this.snapshot = {
      ...this.snapshot,
      plan: result.plan,
      queue: enqueueSync(this.snapshot.queue, {
        id: `plan-${result.plan.id}`,
        kind: 'plan',
        body: JSON.stringify(result.plan),
      }),
    };
    return { ok: true };
  }

  confirmDose(id: string): void {
    if (!this.snapshot.plan) {
      return;
    }
    this.snapshot = { ...this.snapshot, plan: confirmDose(this.snapshot.plan, id, this.clock.now()) };
  }

  postponeDose(id: string): void {
    if (!this.snapshot.plan) {
      return;
    }
    this.snapshot = { ...this.snapshot, plan: postponeDose(this.snapshot.plan, id, this.clock.now()) };
  }

  toggleReminder(id: string, enabled: boolean): void {
    if (!this.snapshot.plan) {
      return;
    }
    this.snapshot = { ...this.snapshot, plan: toggleReminder(this.snapshot.plan, id, enabled) };
  }

  saveContact(input: EmergencyContact): { ok: true } | { ok: false; errors: Record<string, string> } {
    const errors = validateContact(input);
    if (Object.keys(errors).length > 0) {
      return { ok: false, errors };
    }
    this.snapshot = { ...this.snapshot, contact: normalizeContact(input) };
    return { ok: true };
  }

  markNoticeRead(id: string): void {
    this.snapshot = {
      ...this.snapshot,
      notices: this.snapshot.notices.map((notice) =>
        notice.id === id ? { ...notice, readAt: this.clock.now().toISOString() } : notice,
      ),
    };
  }

  dismissNotice(id: string): void {
    this.snapshot = {
      ...this.snapshot,
      notices: this.snapshot.notices.filter((notice) => notice.id !== id),
      dismissedNoticeIds: this.snapshot.dismissedNoticeIds.includes(id)
        ? this.snapshot.dismissedNoticeIds
        : [...this.snapshot.dismissedNoticeIds, id],
    };
  }

  snoozeNotice(id: string): void {
    const until = new Date(this.clock.now().getTime() + 2 * 60 * 60 * 1000).toISOString();
    this.snapshot = {
      ...this.snapshot,
      notices: this.snapshot.notices.map((notice) => (notice.id === id ? { ...notice, snoozedUntil: until } : notice)),
    };
  }

  visibleNotices(): Notice[] {
    const now = this.clock.now().getTime();
    return this.snapshot.notices.filter((notice) => !notice.snoozedUntil || Date.parse(notice.snoozedUntil) <= now);
  }

  flushDecision(online: boolean, apiConfigured: boolean, hasSession: boolean) {
    return decideFlush(this.snapshot.queue, online, apiConfigured, hasSession);
  }

  applySyncResult(accepted: string[], rejected: { id: string; reason: string }[], syncedAt: string | null): void {
    this.snapshot = {
      ...this.snapshot,
      queue: applySyncResult(this.snapshot.queue, accepted, rejected),
      // Solo se afirma contacto con el servidor si aceptó al menos un item.
      lastServerSyncAt: accepted.length > 0 && syncedAt ? syncedAt : this.snapshot.lastServerSyncAt,
    };
  }

  pendingSyncCount(): number {
    return pendingCount(this.snapshot.queue);
  }

  samplesBetween(from: Date, to: Date, kind?: BiometricSample['kind']): BiometricSample[] {
    return this.snapshot.samples.filter((sample) => {
      const at = Date.parse(sample.startedAt);
      return at >= from.getTime() && at <= to.getTime() && (!kind || sample.kind === kind);
    });
  }

  private captureNudge(): void {
    const baselines = buildBaselines(this.snapshot.samples, this.clock.now(), [
      'heart_rate',
      'spo2',
      'sleep',
      'steps',
      'resting_heart_rate',
      'hrv',
      'skin_temperature',
      'body_temperature',
    ]);
    const draft = draftNudge(baselines, this.clock.now());
    if (!draft || this.snapshot.notices.some((notice) => notice.id === draft.id)) {
      return;
    }
    const notice: Notice = { ...draft, readAt: null, snoozedUntil: null };
    this.snapshot = { ...this.snapshot, notices: [notice, ...this.snapshot.notices] };
  }

  private enqueueConsent(): void {
    this.snapshot = {
      ...this.snapshot,
      queue: enqueueSync(this.snapshot.queue, {
        id: `consent-${this.clock.now().getTime()}`,
        kind: 'consent',
        body: JSON.stringify(this.snapshot.consent),
      }),
    };
  }
}
