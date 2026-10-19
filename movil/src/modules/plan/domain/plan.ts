export type DoseStatus = 'pending' | 'taken' | 'postponed';

export type Medication = {
  id: string;
  name: string;
  dose: string;
  schedule: string;
  reminderEnabled: boolean;
  status: DoseStatus;
  dueAt: string;
};

export type FollowUpPlan = {
  id: string;
  medications: Medication[];
  comfortSigns: string[];
  homeCare: string[];
  validUntil: string;
  passiveMonitoring: true;
  activatedAt: string;
};

type RawMedication = { name?: string; dose?: string; schedule?: string };
type RawPlan = {
  medications?: RawMedication[];
  comfortSigns?: string[];
  homeCare?: string[];
  validUntil?: string;
  plan?: RawPlan;
};

export type PlanResult = { ok: true; plan: FollowUpPlan } | { ok: false; message: string };

const OPAQUE = /^[A-Za-z0-9-]{6,}$/;

function nextDue(now: Date, schedule: string): string {
  const match = /^(\d{2}):(\d{2})$/.exec(schedule);
  const due = new Date(now);
  if (!match) {
    due.setHours(due.getHours() + 1, 0, 0, 0);
    return due.toISOString();
  }
  due.setHours(Number(match[1]), Number(match[2]), 0, 0);
  if (due.getTime() <= now.getTime()) {
    due.setDate(due.getDate() + 1);
  }
  return due.toISOString();
}

function asPlan(raw: RawPlan, now: Date): PlanResult {
  const source = raw.plan ?? raw;
  const medications = (source.medications ?? []).filter((item) => item.name && item.dose);
  if (medications.length === 0 && (source.comfortSigns ?? []).length === 0 && (source.homeCare ?? []).length === 0) {
    return {
      ok: false,
      message: 'El código no incluye medicación, signos de confort ni cuidados. No se activó un plan.',
    };
  }
  return {
    ok: true,
    plan: {
      id: `plan-${now.getTime()}`,
      medications: medications.map((item, index) => ({
        id: `med-${index + 1}`,
        name: item.name!.trim(),
        dose: item.dose!.trim(),
        schedule: item.schedule && /^\d{2}:\d{2}$/.test(item.schedule) ? item.schedule : '08:00',
        reminderEnabled: true,
        status: 'pending',
        dueAt: nextDue(now, item.schedule && /^\d{2}:\d{2}$/.test(item.schedule) ? item.schedule : '08:00'),
      })),
      comfortSigns: source.comfortSigns ?? [],
      homeCare: source.homeCare ?? [],
      validUntil: source.validUntil ?? new Date(now.getTime() + 14 * 86400000).toISOString(),
      passiveMonitoring: true,
      activatedAt: now.toISOString(),
    },
  };
}

export function parseDischargePayload(raw: string, now: Date): PlanResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { ok: false, message: 'Escribe o escanea el código de la hoja de alta.' };
  }
  if (trimmed.startsWith('{')) {
    try {
      return asPlan(JSON.parse(trimmed) as RawPlan, now);
    } catch {
      return { ok: false, message: 'El código QR no tiene un plan legible.' };
    }
  }
  if (OPAQUE.test(trimmed)) {
    return {
      ok: false,
      message: 'Este código no trae el plan. Hace falta el QR de la hoja de alta o una respuesta del servidor.',
    };
  }
  return { ok: false, message: 'No reconocemos ese código de alta.' };
}

export function resolveDischarge(raw: string, now: Date, remoteBody: string | null): PlanResult {
  const direct = parseDischargePayload(raw, now);
  if (direct.ok) {
    return direct;
  }
  if (remoteBody) {
    return parseDischargePayload(remoteBody, now);
  }
  return direct;
}

export function confirmDose(plan: FollowUpPlan, id: string, now: Date): FollowUpPlan {
  return {
    ...plan,
    medications: plan.medications.map((item) => {
      if (item.id !== id) {
        return item;
      }
      const due = new Date(now);
      const [hours, minutes] = item.schedule.split(':').map(Number);
      due.setDate(due.getDate() + 1);
      due.setHours(hours, minutes, 0, 0);
      return { ...item, status: 'taken', dueAt: due.toISOString() };
    }),
  };
}

export function postponeDose(plan: FollowUpPlan, id: string, now: Date): FollowUpPlan {
  return {
    ...plan,
    medications: plan.medications.map((item) =>
      item.id === id
        ? { ...item, status: 'postponed', dueAt: new Date(now.getTime() + 30 * 60 * 1000).toISOString() }
        : item,
    ),
  };
}

export function toggleReminder(plan: FollowUpPlan, id: string, enabled: boolean): FollowUpPlan {
  return {
    ...plan,
    medications: plan.medications.map((item) => (item.id === id ? { ...item, reminderEnabled: enabled } : item)),
  };
}
