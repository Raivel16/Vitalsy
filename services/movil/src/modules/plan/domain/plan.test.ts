import { confirmDose, parseDischargePayload, postponeDose, resolveDischarge, toggleReminder } from './plan';

const now = new Date('2026-10-03T12:00:00.000Z');

const payload = JSON.stringify({
  medications: [{ name: 'Paracetamol', dose: '1 g', schedule: '08:00' }],
  comfortSigns: ['Reposo si te sientes cansado'],
  homeCare: ['Caminar dentro de casa'],
  validUntil: '2026-10-20T00:00:00.000Z',
});

describe('discharge plan', () => {
  it('activates a plan from a self-contained QR payload', () => {
    const result = parseDischargePayload(payload, now);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    expect(result.plan.passiveMonitoring).toBe(true);
    expect(result.plan.medications[0]).toMatchObject({ name: 'Paracetamol', dose: '1 g', status: 'pending' });
  });

  it('rejects an opaque code when the server has no plan', () => {
    const result = resolveDischarge('ALTA-2026-8841', now, null);
    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }
    expect(result.message).toMatch(/servidor|QR/i);
  });

  it('uses the server body when the scanned code is opaque', () => {
    const result = resolveDischarge('ALTA-2026-8841', now, payload);
    expect(result.ok).toBe(true);
  });

  it('confirms a dose and postpones another', () => {
    const created = parseDischargePayload(payload, now);
    if (!created.ok) {
      throw new Error('expected plan');
    }
    const taken = confirmDose(created.plan, 'med-1', now);
    expect(taken.medications[0].status).toBe('taken');
    const postponed = postponeDose(created.plan, 'med-1', now);
    expect(postponed.medications[0].status).toBe('postponed');
    expect(Date.parse(postponed.medications[0].dueAt) - now.getTime()).toBe(30 * 60 * 1000);
  });

  it('toggles the reminder without dropping the medication', () => {
    const created = parseDischargePayload(payload, now);
    if (!created.ok) {
      throw new Error('expected plan');
    }
    const next = toggleReminder(created.plan, 'med-1', false);
    expect(next.medications[0].reminderEnabled).toBe(false);
    expect(next.medications[0].name).toBe('Paracetamol');
  });
});
