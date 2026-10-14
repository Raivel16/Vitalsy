import type { ServerNotice } from '../../shared/api/lifeClient';
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
  /** Revocación hecha en el teléfono que el servidor aún no confirmó. Se reintenta hasta confirmar. */
  consentRevokePending: boolean;
  /**
   * Revocaciones sin entregar de cuentas que ya no tienen sesión. Sobreviven a cierres de
   * sesión y cambios de cuenta; se reintentan solo cuando vuelve a iniciar sesión ESA cuenta.
   */
  pendingRevokes: PendingRevoke[];
  /** Estado de la lectura de salud: sirve a la sincronización en segundo plano (sin diálogos) y a las lecturas por delta. */
  healthSync: HealthSyncState;
};

export type HealthSyncState = {
  /** La persona concedió la lectura en primer plano. En segundo plano nunca se pide. */
  accessGranted: boolean;
  /** Fin de la última lectura completa; la siguiente lee solo desde aquí. */
  lastReadAt: string | null;
  /** Ya se pidió el permiso de lectura en segundo plano de Health Connect: no se vuelve a pedir en cada lectura. */
  backgroundAccessRequested: boolean;
};

export type PendingRevoke = { accountId: string; pendingSince: string };

const MAX_NOTICES = 200;
const MAX_DISMISSED = 500;

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
    consentRevokePending: false,
    pendingRevokes: [],
    healthSync: { accessGranted: false, lastReadAt: null, backgroundAccessRequested: false },
  };
}

type Clock = {
  now: () => Date;
  random: () => string;
  digest: Digest;
};

export class LifeApp {
  private snapshot: LifeSnapshot;
  private consentRevision = 0;
  private transitions = 0;
  private sessionEpochValue = 0;

  constructor(
    snapshot: LifeSnapshot,
    private clock: Clock,
  ) {
    const consent = { ...CLOSED_CONSENT, ...snapshot.consent };
    // Un código sin vencimiento es un código local anterior a la integración: el servidor nunca lo conoció.
    const legacyCode = Boolean(consent.linkingCode) && !consent.linkingExpiresAt;
    this.snapshot = {
      ...emptySnapshot(),
      ...snapshot,
      consent: legacyCode ? { ...consent, linkingCode: null, linkingIssuedAt: null, linkingExpiresAt: null } : consent,
      consentRevokePending: snapshot.consentRevokePending ?? false,
      pendingRevokes: snapshot.pendingRevokes ?? [],
      healthSync: { ...emptySnapshot().healthSync, ...(snapshot.healthSync ?? {}) },
      queue: (snapshot.queue ?? []).filter((item) => item.kind !== ('consent' as SyncItem['kind'])),
      notices: (snapshot.notices ?? []).slice(0, MAX_NOTICES),
      dismissedNoticeIds: (snapshot.dismissedNoticeIds ?? []).slice(-MAX_DISMISSED),
    };
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
  ):
    | { status: 'ok'; switched: boolean; undeliveredRevoke: boolean }
    | { status: 'needs_confirmation'; pendingCount: number; undeliveredRevoke: boolean } {
    const id = String(account.id);
    const email = account.email.trim().toLowerCase();
    const serverPrevious = this.snapshot.accounts.find((existing) => isServerAccount(existing));
    const localAccounts = this.snapshot.accounts.filter((existing) => !isServerAccount(existing));
    // Los datos locales solo se adoptan si la cuenta local es de la misma persona (mismo correo).
    const switched = serverPrevious
      ? serverPrevious.id !== id
      : localAccounts.length > 0 && !localAccounts.some((existing) => existing.email.trim().toLowerCase() === email);
    const unsent = pendingCount(this.snapshot.queue);
    const departing = this.departingServerAccountId(id);
    const undeliveredNow = Boolean(this.snapshot.consentRevokePending && departing);
    if (switched && (unsent > 0 || undeliveredNow) && !options.confirmed) {
      return {
        status: 'needs_confirmation',
        pendingCount: unsent,
        undeliveredRevoke: undeliveredNow || this.snapshot.pendingRevokes.length > 0,
      };
    }
    // Una revocación sin confirmar nunca se pierde con el reinicio: pasa al registro por cuenta.
    let pendingRevokes = this.snapshot.pendingRevokes;
    if (undeliveredNow && departing) {
      pendingRevokes = this.withRevoke(pendingRevokes, departing);
    }
    const base: LifeSnapshot = switched
      ? { ...emptySnapshot(), pendingRevokes }
      : { ...this.snapshot, pendingRevokes, consentRevokePending: undeliveredNow ? false : this.snapshot.consentRevokePending };
    let next: LifeSnapshot = {
      ...base,
      accounts: [{ id, name: account.name, email, origin: 'server' }],
      sessionUserId: id,
    };
    // Vuelve la cuenta con una revocación sin entregar: queda pendiente y cerrada en el teléfono.
    if (next.pendingRevokes.some((record) => record.accountId === id)) {
      next = {
        ...next,
        pendingRevokes: next.pendingRevokes.filter((record) => record.accountId !== id),
        consent: revokeAll(next.consent, this.clock.now()),
        consentRevokePending: true,
      };
    }
    this.snapshot = next;
    this.sessionEpochValue += 1;
    return { status: 'ok', switched, undeliveredRevoke: next.pendingRevokes.length > 0 };
  }

  logout(): void {
    const departing = this.snapshot.consentRevokePending ? this.departingServerAccountId(null) : null;
    this.snapshot = {
      ...this.snapshot,
      sessionUserId: null,
      // El permiso y la ventana de lectura son de la cuenta que se va: la siguiente empieza limpia.
      healthSync: emptySnapshot().healthSync,
      ...(departing
        ? { pendingRevokes: this.withRevoke(this.snapshot.pendingRevokes, departing), consentRevokePending: false }
        : {}),
    };
    this.sessionEpochValue += 1;
  }

  /** Cuenta del servidor con sesión abierta distinta de `nextId` (null: cualquiera). */
  private departingServerAccountId(nextId: string | null): string | null {
    const current = this.currentUser();
    if (!current || !isServerAccount(current) || current.id === nextId) {
      return null;
    }
    return current.id;
  }

  private withRevoke(records: PendingRevoke[], accountId: string): PendingRevoke[] {
    if (records.some((record) => record.accountId === accountId)) {
      return records;
    }
    return [...records, { accountId, pendingSince: this.snapshot.consent.revokedAt ?? this.clock.now().toISOString() }];
  }

  /** Cuenta del servidor cuya revocación sigue sin confirmarse (sesión actual o ya cerrada). */
  hasUndeliveredRevoke(): boolean {
    return this.snapshot.consentRevokePending || this.snapshot.pendingRevokes.length > 0;
  }

  /** Mientras dura un cambio de sesión nada se envía al servidor (el token y la cuenta no coinciden aún). */
  beginSessionChange(): void {
    this.transitions += 1;
    this.sessionEpochValue += 1;
  }

  endSessionChange(): void {
    this.transitions = Math.max(0, this.transitions - 1);
    this.sessionEpochValue += 1;
  }

  get sessionChanging(): boolean {
    return this.transitions > 0;
  }

  /** Cambia con cada apertura/cierre de sesión: un envío en curso lo compara para no seguir con otra cuenta. */
  get sessionEpoch(): number {
    return this.sessionEpochValue;
  }

  markHealthAccess(granted: boolean): void {
    if (this.snapshot.healthSync.accessGranted === granted) {
      return;
    }
    this.snapshot = { ...this.snapshot, healthSync: { ...this.snapshot.healthSync, accessGranted: granted } };
  }

  markBackgroundAccessRequested(): void {
    if (!this.snapshot.healthSync.backgroundAccessRequested) {
      this.snapshot = { ...this.snapshot, healthSync: { ...this.snapshot.healthSync, backgroundAccessRequested: true } };
    }
  }

  recordHealthRead(at: string): void {
    this.snapshot = { ...this.snapshot, healthSync: { ...this.snapshot.healthSync, lastReadAt: at } };
  }

  /**
   * Agrega muestras nuevas. Una muestra con un id ya conocido pero con otro valor (p. ej. una noche de
   * sueño que creció) reemplaza a la anterior y se vuelve a encolar; si es idéntica se ignora.
   */
  addSamples(samples: BiometricSample[]): number {
    const known = new Map(this.snapshot.samples.map((sample) => [sample.id, sample]));
    const changed: BiometricSample[] = [];
    for (const sample of samples) {
      const previous = known.get(sample.id);
      if (!previous || previous.value !== sample.value || previous.endedAt !== sample.endedAt) {
        known.set(sample.id, sample);
        changed.push(sample);
      }
    }
    if (changed.length === 0) {
      return 0;
    }
    const queue = enqueueSync(this.snapshot.queue, {
      id: `bio-${this.clock.now().getTime()}-${changed[0].id}`,
      kind: 'biometrics',
      body: JSON.stringify(changed),
    });
    const replaced = new Set(changed.map((sample) => sample.id));
    const kept = this.snapshot.samples.filter((sample) => !replaced.has(sample.id));
    this.snapshot = {
      ...this.snapshot,
      samples: [...kept, ...changed],
      queue,
      lastLocalReadAt: this.clock.now().toISOString(),
    };
    this.captureNudge();
    return changed.length;
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

  /** Cambia el consentimiento solo en el teléfono (modo sin servidor). El servidor se avisa en consentSync. */
  setSharing(enabled: boolean): void {
    const consent = setSharing(this.snapshot.consent, enabled, this.clock.now());
    if (!enabled) {
      this.consentRevision += 1;
    }
    this.snapshot = { ...this.snapshot, consent };
  }

  /** Contador que cambia con cada revocación: permite descartar respuestas tardías del servidor. */
  get consentVersion(): number {
    return this.consentRevision;
  }

  /** El servidor confirmó que la compartición está activa. */
  confirmSharing(): void {
    this.snapshot = {
      ...this.snapshot,
      consent: setSharing(this.snapshot.consent, true, this.clock.now()),
      consentRevokePending: false,
    };
  }

  /** El servidor confirmó la revocación: ya no hay nada pendiente. */
  confirmRevoke(): void {
    this.snapshot = { ...this.snapshot, consentRevokePending: false };
  }

  /** Solo modo local (sin servidor configurado): no hay código oficial que emitir en la app. */
  issueLinkingCode(): { ok: true; code: string } | { ok: false; message: string } {
    const result = issueLinkingCode(this.snapshot.consent, this.clock.now(), this.clock.random());
    this.snapshot = { ...this.snapshot, consent: result.state };
    if (!result.code) {
      return { ok: false, message: result.message ?? 'No se pudo generar el código.' };
    }
    return { ok: true, code: result.code };
  }

  /** Guarda el código emitido por el servidor, solo si la compartición sigue confirmada. */
  setServerLinkCode(code: string, expiresAt: string): boolean {
    if (!this.snapshot.consent.sharingEnabled || this.snapshot.consentRevokePending) {
      return false;
    }
    this.snapshot = {
      ...this.snapshot,
      consent: { ...this.snapshot.consent, linkingCode: code, linkingIssuedAt: this.clock.now().toISOString(), linkingExpiresAt: expiresAt },
    };
    return true;
  }

  /**
   * Cierra todo en el teléfono de inmediato. Con `awaitServer` queda un pendiente
   * durable hasta que el servidor confirme la revocación.
   */
  revokeSharing(awaitServer = false): void {
    this.consentRevision += 1;
    this.snapshot = {
      ...this.snapshot,
      consent: revokeAll(this.snapshot.consent, this.clock.now()),
      consentRevokePending: awaitServer,
    };
  }

  /** Une los avisos del servidor con los locales sin duplicar por id. Devuelve cuántos agregó. */
  mergeServerNotices(incoming: ServerNotice[]): number {
    const known = new Set([...this.snapshot.notices.map((notice) => notice.id), ...this.snapshot.dismissedNoticeIds]);
    const fresh: Notice[] = [];
    for (const item of incoming) {
      if (known.has(item.id)) {
        continue;
      }
      known.add(item.id);
      fresh.push({
        id: item.id,
        kind: item.kind === 'habito' ? 'habit' : 'stability',
        title: item.title,
        body: item.body,
        createdAt: item.createdAt,
        readAt: null,
        snoozedUntil: null,
      });
    }
    if (fresh.length > 0) {
      this.snapshot = { ...this.snapshot, notices: [...fresh, ...this.snapshot.notices].slice(0, MAX_NOTICES) };
    }
    return fresh.length;
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
        : [...this.snapshot.dismissedNoticeIds, id].slice(-MAX_DISMISSED),
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
    this.snapshot = { ...this.snapshot, notices: [notice, ...this.snapshot.notices].slice(0, MAX_NOTICES) };
  }
}
