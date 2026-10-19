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

describe('discharge plan edge cases', () => {
  const local = new Date(2026, 9, 3, 12, 0, 0);

  function plan(body: unknown) {
    const result = parseDischargePayload(JSON.stringify(body), local);
    if (!result.ok) {
      throw new Error(result.message);
    }
    return result.plan;
  }

  it('asks for a code when the input is empty', () => {
    const result = parseDischargePayload('   ', local);
    expect(result).toEqual({ ok: false, message: expect.stringMatching(/escribe o escanea/i) });
  });

  it('trims names and falls back to 08:00 for an unreadable schedule', () => {
    const created = plan({
      medications: [
        { name: ' Paracetamol ', dose: ' 1 g ', schedule: '20:30' },
        { name: 'Omeprazol', dose: '20 mg', schedule: 'por la noche' },
        { name: '', dose: 'sin nombre' },
      ],
    });
    expect(created.medications).toHaveLength(2);
    expect(created.medications[0]).toMatchObject({ name: 'Paracetamol', dose: '1 g', schedule: '20:30' });
    expect(created.medications[1]).toMatchObject({ id: 'med-2', schedule: '08:00' });
  });

  it('schedules a dose today when its time has not come and tomorrow when it passed', () => {
    const created = plan({
      medications: [
        { name: 'Tarde', dose: '1', schedule: '20:30' },
        { name: 'Manana', dose: '1', schedule: '08:00' },
      ],
    });
    const later = new Date(created.medications[0].dueAt);
    expect([later.getDate(), later.getHours(), later.getMinutes()]).toEqual([3, 20, 30]);
    const tomorrow = new Date(created.medications[1].dueAt);
    expect([tomorrow.getDate(), tomorrow.getHours()]).toEqual([4, 8]);
  });

  it('defaults validity to fourteen days and accepts a nested plan object', () => {
    const created = plan({ plan: { medications: [{ name: 'A', dose: '1' }] } });
    expect(created.validUntil).toBe(new Date(local.getTime() + 14 * 86400000).toISOString());
  });

  it('refuses a plan without medication, comfort signs or home care', () => {
    const result = parseDischargePayload('{"medications": []}', local);
    expect(result).toEqual({ ok: false, message: expect.stringMatching(/no incluye medicación/i) });
  });

  it('reports unreadable JSON and unknown text', () => {
    expect(parseDischargePayload('{roto', local)).toEqual({ ok: false, message: expect.stringMatching(/legible/i) });
    expect(parseDischargePayload('¿?', local)).toEqual({ ok: false, message: expect.stringMatching(/no reconocemos/i) });
  });

  it('moves a confirmed dose to the next day and leaves the other medications untouched', () => {
    const created = plan({
      medications: [
        { name: 'A', dose: '1', schedule: '08:00' },
        { name: 'B', dose: '2', schedule: '09:00' },
      ],
    });
    const next = confirmDose(created, 'med-1', local);
    expect(new Date(next.medications[0].dueAt).getDate()).toBe(4);
    expect(next.medications[1]).toBe(created.medications[1]);
  });
});
