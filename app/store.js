// Progress store for the Leonida Trophy Guide.
// One job only: keep the earned set and the spoiler setting in localStorage,
// and export / import that state as JSON. No network, no other state lives here.
export const STORAGE_KEY = 'gta6-trophy-guide-v1';

export function loadStoredState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { earned: [], spoiler: false };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { earned: [], spoiler: false };
    return {
      earned: Array.isArray(parsed.earned) ? parsed.earned.filter((n) => typeof n === 'number') : [],
      spoiler: parsed.spoiler === true,
    };
  } catch {
    return { earned: [], spoiler: false };
  }
}

export function saveStoredState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      earned: [...state.earned].sort((a, b) => a - b),
      spoiler: state.spoiler === true,
      exportedAt: new Date().toISOString(),
    }));
  } catch {
    // Storage full or unavailable (private mode): progress still works in memory.
  }
}

export function stateToExport(state, total) {
  return {
    app: 'gta6-trophy-guide',
    version: 1,
    earned: [...state.earned].sort((a, b) => a - b),
    earnedCount: state.earned.length,
    total,
    spoiler: state.spoiler === true,
    exportedAt: new Date().toISOString(),
  };
}

export function stateFromImport(text, validIds) {
  const parsed = JSON.parse(text);
  const source = parsed && typeof parsed === 'object' ? parsed : null;
  if (!source || !Array.isArray(source.earned)) throw new Error('Not a progress file from this guide.');
  const earned = [...new Set(source.earned)].filter((n) => validIds.has(n));
  return { earned, spoiler: source.spoiler === true };
}

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
