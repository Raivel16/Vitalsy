type DraftMap = Record<string, unknown>;

function key(encounterId: string) {
  return `vitalsy-admit-draft-${encounterId}`;
}

function readAll(encounterId: string): DraftMap {
  try {
    const raw = sessionStorage.getItem(key(encounterId));
    return raw ? JSON.parse(raw) as DraftMap : {};
  } catch {
    return {};
  }
}

export function readDraft<T>(encounterId: string, part: string): T | null {
  const value = readAll(encounterId)[part];
  return (value as T) ?? null;
}

export function writeDraft(encounterId: string, part: string, value: unknown) {
  const next = { ...readAll(encounterId), [part]: value };
  sessionStorage.setItem(key(encounterId), JSON.stringify(next));
}
