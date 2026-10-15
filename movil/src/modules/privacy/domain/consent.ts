export type InstitutionGrant = {
  id: string;
  name: string;
  grantedAt: string;
};

export type ConsentState = {
  sharingEnabled: boolean;
  linkingCode: string | null;
  linkingIssuedAt: string | null;
  /** Vencimiento del código emitido por el servidor (TTL 30 min). Null en datos anteriores. */
  linkingExpiresAt: string | null;
  revokedAt: string | null;
  institutions: InstitutionGrant[];
};

export const CLOSED_CONSENT: ConsentState = {
  sharingEnabled: false,
  linkingCode: null,
  linkingIssuedAt: null,
  linkingExpiresAt: null,
  revokedAt: null,
  institutions: [],
};

/** Código vigente: existe y todavía no venció. Nunca devuelve un código vencido. */
export function activeLinkingCode(state: ConsentState, now: Date): string | null {
  if (!state.linkingCode) {
    return null;
  }
  // Solo vale un código con vencimiento: el emitido por el servidor. Sin él sería un código local.
  if (!state.linkingExpiresAt || !(Date.parse(state.linkingExpiresAt) > now.getTime())) {
    return null;
  }
  return state.linkingCode;
}

export function linkCodeExpiryLabel(expiresAt: string | null | undefined): string {
  if (!expiresAt) {
    return '';
  }
  const at = new Date(expiresAt);
  if (Number.isNaN(at.getTime())) {
    return '';
  }
  const pad = (value: number) => String(value).padStart(2, '0');
  return `Vence a las ${pad(at.getHours())}:${pad(at.getMinutes())}`;
}

/** Solo para el modo sin servidor configurado (pruebas de dominio). La app no lo muestra como código oficial. */
export function formatLinkCode(randomHex: string): string {
  const clean = randomHex.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().padEnd(8, 'X').slice(0, 8);
  return `VL-${clean.slice(0, 4)}-${clean.slice(4, 8)}`;
}

export function setSharing(state: ConsentState, enabled: boolean, now: Date): ConsentState {
  if (!enabled) {
    return revokeAll(state, now);
  }
  return { ...state, sharingEnabled: true, revokedAt: null };
}

export function issueLinkingCode(
  state: ConsentState,
  now: Date,
  randomHex: string,
): { state: ConsentState; code?: string; message?: string } {
  if (!state.sharingEnabled) {
    return {
      state,
      message: 'Activa la compartición con instituciones antes de generar un código.',
    };
  }
  const code = formatLinkCode(randomHex);
  return {
    state: { ...state, linkingCode: code, linkingIssuedAt: now.toISOString(), linkingExpiresAt: null },
    code,
  };
}

export function grantInstitution(state: ConsentState, name: string, now: Date): ConsentState {
  if (!state.sharingEnabled || !state.linkingCode) {
    return state;
  }
  const trimmed = name.trim();
  if (!trimmed || state.institutions.some((item) => item.name === trimmed)) {
    return state;
  }
  return {
    ...state,
    institutions: [...state.institutions, { id: `inst-${state.institutions.length + 1}`, name: trimmed, grantedAt: now.toISOString() }],
  };
}

export function revokeAll(state: ConsentState, now: Date): ConsentState {
  return {
    sharingEnabled: false,
    linkingCode: null,
    linkingIssuedAt: null,
    linkingExpiresAt: null,
    revokedAt: now.toISOString(),
    institutions: [],
  };
}
