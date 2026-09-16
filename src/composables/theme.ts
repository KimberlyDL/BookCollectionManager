import { ref, watch } from 'vue';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'booklook-theme';

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function getStoredTheme(): ThemeMode | null {
  const value = localStorage.getItem(STORAGE_KEY);
  return value === 'light' || value === 'dark' ? value : null;
}

function applyTheme(mode: ThemeMode) {
  document.documentElement.setAttribute('data-theme', mode);
}

export const theme = ref<ThemeMode>(getStoredTheme() ?? (systemPrefersDark() ? 'dark' : 'light'));

applyTheme(theme.value);

watch(theme, (mode) => {
  applyTheme(mode);
  localStorage.setItem(STORAGE_KEY, mode);
});

export function toggleTheme(): void {
  theme.value = theme.value === 'dark' ? 'light' : 'dark';
}
