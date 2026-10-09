export type InstitutionGrant = {
  id: string;
  name: string;
  grantedAt: string;
};

export type ConsentState = {
  sharingEnabled: boolean;
  linkingCode: string | null;
  linkingIssuedAt: string | null;
  revokedAt: string | null;
  institutions: InstitutionGrant[];
};

export const CLOSED_CONSENT: ConsentState = {
  sharingEnabled: false,
  linkingCode: null,
  linkingIssuedAt: null,
  revokedAt: null,
  institutions: [],
};

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
    state: { ...state, linkingCode: code, linkingIssuedAt: now.toISOString() },
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
    revokedAt: now.toISOString(),
    institutions: [],
  };
}
