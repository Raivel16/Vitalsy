import { activeLinkingCode, CLOSED_CONSENT, grantInstitution, issueLinkingCode, linkCodeExpiryLabel, revokeAll, setSharing } from './consent';

const now = new Date('2026-10-03T12:00:00.000Z');

describe('consent', () => {
  it('starts closed and refuses a linking code', () => {
    const result = issueLinkingCode(CLOSED_CONSENT, now, 'abcd1234');
    expect(result.code).toBeUndefined();
    expect(result.message).toMatch(/compartición/i);
    expect(result.state.linkingCode).toBeNull();
  });

  it('issues a code only after sharing is enabled', () => {
    const open = setSharing(CLOSED_CONSENT, true, now);
    const result = issueLinkingCode(open, now, 'abcd1234');
    expect(result.code).toBe('VL-ABCD-1234');
    expect(result.state.linkingCode).toBe('VL-ABCD-1234');
  });

  it('revokes the code and every institution', () => {
    const open = setSharing(CLOSED_CONSENT, true, now);
    const issued = issueLinkingCode(open, now, 'abcd1234').state;
    const granted = grantInstitution(issued, 'Clínica del Valle', now);
    const revoked = revokeAll(granted, now);
    expect(revoked.sharingEnabled).toBe(false);
    expect(revoked.linkingCode).toBeNull();
    expect(revoked.institutions).toEqual([]);
    expect(revoked.revokedAt).toBe(now.toISOString());
  });

  it('treats a server code as active only until it expires', () => {
    const state = { ...setSharing(CLOSED_CONSENT, true, now), linkingCode: 'ABCD-1234', linkingExpiresAt: '2026-10-03T12:30:00.000Z' };
    expect(activeLinkingCode(state, now)).toBe('ABCD-1234');
    expect(activeLinkingCode(state, new Date('2026-10-03T12:30:00.000Z'))).toBeNull();
    expect(activeLinkingCode({ ...state, linkingCode: null }, now)).toBeNull();
    expect(revokeAll(state, now).linkingExpiresAt).toBeNull();
  });

  it('formats the expiry as HH:mm', () => {
    const label = linkCodeExpiryLabel('2026-10-03T12:30:00.000Z');
    expect(label).toMatch(/^Vence a las \d{2}:\d{2}$/);
    expect(linkCodeExpiryLabel(null)).toBe('');
  });

  it('does not attach an institution while sharing is off', () => {
    expect(grantInstitution(CLOSED_CONSENT, 'Clínica', now).institutions).toEqual([]);
  });
});
