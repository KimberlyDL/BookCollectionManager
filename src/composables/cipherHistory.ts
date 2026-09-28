import { ref, watch } from 'vue';
import type { CipherFormat, CipherMode, CipherType } from '../services/cipher';

// Cipher history lives only on this device (localStorage) — no account or
// network needed, so the Cipher tab works offline and signed out.

export interface CipherHistoryEntry {
  id: string;
  createdAt: number;
  type: CipherType;
  mode: CipherMode;
  /** Missing on entries saved before formats existed — those were lenient. */
  format?: CipherFormat;
  key: string;
  input: string;
  output: string;
}

const STORAGE_KEY = 'booklook-cipher-history';
const MAX_ENTRIES = 100;

function load(): CipherHistoryEntry[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export const cipherHistory = ref<CipherHistoryEntry[]>(load());

watch(
  cipherHistory,
  (entries) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // Storage full or blocked — history just won't persist this session.
    }
  },
  { deep: true }
);

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function addHistoryEntry(entry: Omit<CipherHistoryEntry, 'id' | 'createdAt'>): CipherHistoryEntry {
  const latest = cipherHistory.value[0];
  const isDuplicate =
    latest &&
    latest.type === entry.type &&
    latest.mode === entry.mode &&
    (latest.format ?? 'lenient') === (entry.format ?? 'lenient') &&
    latest.key === entry.key &&
    latest.input === entry.input;
  if (isDuplicate) return latest;

  const created = { ...entry, id: makeId(), createdAt: Date.now() };
  cipherHistory.value = [created, ...cipherHistory.value].slice(0, MAX_ENTRIES);
  return created;
}

/** Removes an entry and returns a function that puts it back (for Undo). */
export function removeHistoryEntry(id: string): () => void {
  const index = cipherHistory.value.findIndex((e) => e.id === id);
  if (index === -1) return () => undefined;
  const [removed] = cipherHistory.value.splice(index, 1);
  return () => {
    if (cipherHistory.value.some((e) => e.id === removed.id)) return;
    const next = [...cipherHistory.value];
    next.splice(Math.min(index, next.length), 0, removed);
    cipherHistory.value = next;
  };
}

export function clearHistory(): void {
  cipherHistory.value = [];
}
