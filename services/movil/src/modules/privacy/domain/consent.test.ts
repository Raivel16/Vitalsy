import { CLOSED_CONSENT, grantInstitution, issueLinkingCode, revokeAll, setSharing } from './consent';

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

  it('does not attach an institution while sharing is off', () => {
    expect(grantInstitution(CLOSED_CONSENT, 'Clínica', now).institutions).toEqual([]);
  });
});
