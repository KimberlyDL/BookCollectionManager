<template>
  <ion-page>
    <ion-header>
      <ion-toolbar class="app-toolbar">
        <ion-title>Cipher</ion-title>
        <ion-buttons slot="end">
          <ion-button
            class="app-theme-toggle"
            @click="toggleTheme"
            :aria-label="theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            <ion-icon slot="icon-only" :icon="theme === 'dark' ? sunnyOutline : moonOutline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <ion-toolbar class="app-toolbar">
        <ion-segment v-model="view">
          <ion-segment-button value="workspace">
            <ion-label>Workspace</ion-label>
          </ion-segment-button>
          <ion-segment-button value="history">
            <ion-label>History{{ cipherHistory.length ? ` (${cipherHistory.length})` : '' }}</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>

    <ion-content ref="contentEl" class="app-content">
      <!-- Workspace -->
      <div v-if="view === 'workspace'" class="cipher-page">
        <section class="app-card cipher-card">
          <ion-item class="app-field" lines="none">
            <ion-select
              v-model="cipherType"
              label="Cipher"
              label-placement="stacked"
              interface="popover"
            >
              <ion-select-option value="caesar">Caesar cipher</ion-select-option>
              <ion-select-option value="vigenere">Vigenère cipher</ion-select-option>
            </ion-select>
          </ion-item>
          <p class="cipher-note">
            <template v-if="cipherType === 'caesar'">
              Every letter moves the same number of places down the alphabet.
            </template>
            <template v-else>
              Each letter moves by a different amount, set by the letters of a repeating keyword.
            </template>
          </p>

          <div class="cipher-format">
            <span class="cipher-label">Format</span>
            <ion-segment v-model="format" class="cipher-format__toggle">
              <ion-segment-button value="strict">
                <ion-label>Strict</ion-label>
              </ion-segment-button>
              <ion-segment-button value="lenient">
                <ion-label>Lenient</ion-label>
              </ion-segment-button>
            </ion-segment>
          </div>
          <p class="cipher-note">
            <template v-if="format === 'strict'">
              Classic textbook style: the message becomes CAPITAL letters only, and the ciphertext is written in 5-letter groups.
            </template>
            <template v-else>
              Modern style: only letters change. Spaces, numbers and punctuation stay where they are.
            </template>
          </p>

          <ion-segment v-model="mode" class="cipher-mode">
            <ion-segment-button value="encrypt">
              <ion-icon :icon="lockClosedOutline"></ion-icon>
              <ion-label>Encrypt</ion-label>
            </ion-segment-button>
            <ion-segment-button value="decrypt">
              <ion-icon :icon="lockOpenOutline"></ion-icon>
              <ion-label>Decrypt</ion-label>
            </ion-segment-button>
          </ion-segment>

          <!-- Caesar key -->
          <div v-if="cipherType === 'caesar'" class="cipher-key">
            <div class="cipher-key__head">
              <span class="cipher-label">Shift (k)</span>
              <span class="cipher-key__preview">A → {{ ALPHABET[shift % 26] }}</span>
            </div>
            <div class="cipher-shift">
              <ion-button fill="clear" :disabled="shift <= 1" aria-label="Decrease shift" @click="shift--">
                <ion-icon slot="icon-only" :icon="removeOutline"></ion-icon>
              </ion-button>
              <ion-range
                v-model="shift"
                :min="1"
                :max="25"
                :step="1"
                :pin="true"
                :snaps="true"
                aria-label="Shift amount"
              ></ion-range>
              <ion-button fill="clear" :disabled="shift >= 25" aria-label="Increase shift" @click="shift++">
                <ion-icon slot="icon-only" :icon="addOutline"></ion-icon>
              </ion-button>
              <span class="cipher-shift__value">{{ shift }}</span>
            </div>
          </div>

          <!-- Vigenère key -->
          <div v-else class="cipher-key">
            <ion-item class="app-field" lines="none">
              <ion-input
                v-model="keyword"
                label="Keyword"
                label-placement="stacked"
                placeholder="e.g. LEMON"
                autocapitalize="characters"
                autocomplete="off"
                :spellcheck="false"
                :maxlength="40"
                @keyup.enter="run"
              ></ion-input>
            </ion-item>
            <p v-if="keyword && keyError" class="cipher-error">{{ keyError }}</p>
            <div v-else-if="keyword" class="cipher-key-letters" aria-label="Keyword shifts">
              <span v-for="(letter, i) in keywordLetters" :key="i" class="cipher-key-letter">
                <b>{{ letter }}</b>
                <small>{{ ALPHABET.indexOf(letter) }}</small>
              </span>
            </div>
          </div>
        </section>

        <section class="app-card cipher-card">
          <ion-item class="app-field cipher-field" lines="none">
            <ion-textarea
              v-model="inputText"
              :label="mode === 'encrypt' ? 'Plaintext' : 'Ciphertext'"
              label-placement="stacked"
              :placeholder="mode === 'encrypt' ? 'Type the message to encrypt…' : 'Paste the message to decrypt…'"
              :auto-grow="true"
              :rows="3"
              :maxlength="MAX_INPUT"
              autocapitalize="off"
              :spellcheck="false"
            ></ion-textarea>
          </ion-item>

          <div class="cipher-input-actions">
            <ion-button size="small" fill="clear" @click="fillExample">
              <ion-icon slot="start" :icon="sparklesOutline"></ion-icon>
              Try an example
            </ion-button>
            <ion-button v-if="inputText" size="small" fill="clear" color="medium" @click="inputText = ''">
              Clear
            </ion-button>
          </div>

          <div v-if="format === 'strict' && inputText" class="cipher-preview">
            <p class="cipher-preview__title">
              <span>Ready to {{ mode }}</span>
              <span>{{ prepared.text.length }} letter{{ prepared.text.length === 1 ? '' : 's' }}</span>
            </p>
            <p v-if="prepared.text" class="cipher-preview__text">
              <span
                v-for="(part, i) in prepared.parts"
                :key="i"
                :class="`cipher-preview__part--${part.kind}`"
                :title="part.kind === 'letter' ? undefined : `from “${part.source}”`"
              >{{ part.text }}</span>
            </p>
            <p v-else class="cipher-preview__empty">Nothing left to {{ mode }} — type some letters.</p>
            <div v-if="strictChanges.length" class="cipher-preview__changes">
              <span v-for="change in strictChanges" :key="change.label" class="cipher-guide__tag" :class="change.cls">
                {{ change.label }}
              </span>
            </div>
          </div>

          <div class="cipher-guide">
            <p class="cipher-guide__title">
              <ion-icon :icon="informationCircleOutline"></ion-icon>
              Accepted characters
            </p>
            <ul v-if="format === 'strict'">
              <li><span class="cipher-guide__tag cipher-guide__tag--yes">A–Z a–z</span> {{ modeVerb }} as CAPITALS</li>
              <li v-if="mode === 'encrypt'">
                <span class="cipher-guide__tag cipher-guide__tag--digit">0–9</span> spelled out first (3 → THREE)
              </li>
              <li><span class="cipher-guide__tag cipher-guide__tag--accent">é ñ ü</span> accent removed (é → E)</li>
              <li>
                <span class="cipher-guide__tag">{{ mode === 'encrypt' ? '' : '0–9 ' }}␣ . , ! ? 🙂 …</span>
                removed
              </li>
            </ul>
            <ul v-else>
              <li><span class="cipher-guide__tag cipher-guide__tag--yes">A–Z a–z</span> transformed, capitals stay capitals</li>
              <li>
                <span class="cipher-guide__tag">0–9 ␣ . , ! ? é 🙂 …</span>
                kept exactly as typed
              </li>
            </ul>
            <p v-if="inputText && format === 'lenient'" class="cipher-guide__stats">
              <b>{{ stats.letters }}</b> letter{{ stats.letters === 1 ? '' : 's' }} will be {{ modeVerb }}
              · <b>{{ stats.kept }}</b> kept as-is
              <template v-if="stats.keptChars.length">
                ({{ stats.keptChars.slice(0, 8).join(' ') }}{{ stats.keptChars.length > 8 ? ' …' : '' }})
              </template>
            </p>
          </div>

          <ion-button
            expand="block"
            class="app-primary-button cipher-run"
            :disabled="!canRun"
            @click="run"
          >
            <ion-icon slot="start" :icon="mode === 'encrypt' ? lockClosedOutline : lockOpenOutline"></ion-icon>
            {{ mode === 'encrypt' ? 'Encrypt' : 'Decrypt' }}
          </ion-button>
          <p v-if="inputText && !letterCount" class="cipher-error">
            There are no letters A–Z to {{ mode }}.
          </p>
        </section>

        <template v-if="result">
          <section ref="resultEl" class="app-card cipher-card cipher-result">
            <div class="cipher-result__head">
              <span class="cipher-label">{{ result.mode === 'encrypt' ? 'Ciphertext' : 'Plaintext' }}</span>
              <span class="cipher-result__meta">{{ summarize(result) }}</span>
            </div>
            <p class="cipher-output">{{ result.output }}</p>
            <p v-if="isStale" class="cipher-stale">
              Settings or text changed — tap {{ mode === 'encrypt' ? 'Encrypt' : 'Decrypt' }} to update.
            </p>
            <div class="cipher-result__actions">
              <ion-button size="small" fill="outline" @click="copy(result.output)">
                <ion-icon slot="start" :icon="copyOutline"></ion-icon>
                Copy
              </ion-button>
              <ion-button size="small" fill="outline" @click="swap">
                <ion-icon slot="start" :icon="swapVerticalOutline"></ion-icon>
                {{ result.mode === 'encrypt' ? 'Decrypt this' : 'Encrypt this' }}
              </ion-button>
            </div>
          </section>

          <section class="app-card cipher-card">
            <span class="cipher-label">How it works</span>
            <CipherSteps :steps="result.steps" :type="result.type" :mode="result.mode" />
          </section>
        </template>
      </div>

      <!-- History -->
      <div v-else class="cipher-page">
        <div v-if="cipherHistory.length" class="cipher-history-head">
          <ion-text color="medium">
            <p>Saved on this device only. Tap an entry to open it.</p>
          </ion-text>
          <ion-button size="small" fill="clear" color="danger" @click="confirmClear">Clear all</ion-button>
        </div>

        <ion-item-sliding v-for="entry in cipherHistory" :key="entry.id">
          <div class="app-card cipher-history-card" @click="openEntry(entry)">
            <ion-button
              class="app-book-delete"
              fill="clear"
              color="danger"
              aria-label="Delete entry"
              @click.stop="deleteEntry(entry)"
            >
              <ion-icon slot="icon-only" :icon="trashOutline"></ion-icon>
            </ion-button>
            <div class="cipher-history-card__tags">
              <ion-badge :color="entry.mode === 'encrypt' ? 'primary' : 'tertiary'">
                {{ entry.mode === 'encrypt' ? 'Encrypted' : 'Decrypted' }}
              </ion-badge>
              <span>{{ summarize(entry) }}</span>
            </div>
            <p class="cipher-history-card__text">{{ entry.input }}</p>
            <p class="cipher-history-card__text cipher-history-card__text--out">→ {{ entry.output }}</p>
            <p class="cipher-history-card__time">{{ formatTime(entry.createdAt) }}</p>
          </div>
          <ion-item-options side="end">
            <ion-item-option color="danger" @click="deleteEntry(entry)">Delete</ion-item-option>
          </ion-item-options>
        </ion-item-sliding>

        <div v-if="!cipherHistory.length" class="app-empty-state">
          <ion-icon :icon="timeOutline"></ion-icon>
          <ion-text color="medium">
            <p>No history yet. Encrypt or decrypt something and it will show up here.</p>
          </ion-text>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import {
  alertController,
  IonBadge,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonPage,
  IonRange,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonText,
  IonTextarea,
  IonTitle,
  IonToolbar,
  toastController,
} from '@ionic/vue';
import {
  addOutline,
  copyOutline,
  informationCircleOutline,
  lockClosedOutline,
  lockOpenOutline,
  moonOutline,
  removeOutline,
  sparklesOutline,
  sunnyOutline,
  swapVerticalOutline,
  timeOutline,
  trashOutline,
} from 'ionicons/icons';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import {
  ALPHABET,
  analyzeText,
  prepareStrictInput,
  runCipher,
  validateKey,
  type CipherFormat,
  type CipherMode,
  type CipherResult,
  type CipherType,
} from '../services/cipher';
import {
  addHistoryEntry,
  cipherHistory,
  clearHistory,
  removeHistoryEntry,
  type CipherHistoryEntry,
} from '../composables/cipherHistory';
import { theme, toggleTheme } from '../composables/theme';
import CipherSteps from '../components/CipherSteps.vue';

const MAX_INPUT = 2000;

interface RunResult extends CipherResult {
  type: CipherType;
  mode: CipherMode;
  format: CipherFormat;
  key: string;
  input: string;
}

const view = ref<'workspace' | 'history'>('workspace');
const cipherType = ref<CipherType>('caesar');
const mode = ref<CipherMode>('encrypt');
const format = ref<CipherFormat>('strict');
const shift = ref(3);
const keyword = ref('');
const inputText = ref('');
const result = ref<RunResult | null>(null);
const contentEl = ref<InstanceType<typeof IonContent> | null>(null);
const resultEl = ref<HTMLElement | null>(null);

const currentKey = computed(() => (cipherType.value === 'caesar' ? String(shift.value) : keyword.value.trim()));
const keyError = computed(() => validateKey(cipherType.value, currentKey.value));
const keywordLetters = computed(() => keyword.value.toUpperCase().replace(/[^A-Z]/g, '').split(''));
const stats = computed(() => analyzeText(inputText.value));
const prepared = computed(() => prepareStrictInput(inputText.value, mode.value));
const letterCount = computed(() => (format.value === 'strict' ? prepared.value.text.length : stats.value.letters));
const modeVerb = computed(() => (mode.value === 'encrypt' ? 'encrypted' : 'decrypted'));
const canRun = computed(() => !keyError.value && letterCount.value > 0);

// Summary chips under the strict preview: what the filter changed.
const strictChanges = computed(() => {
  const p = prepared.value;
  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const changes: { label: string; cls?: string }[] = [];
  if (p.lowercase) changes.push({ label: `${plural(p.lowercase, 'letter')} capitalized` });
  if (p.digits) changes.push({ label: `${plural(p.digits, 'digit')} spelled out`, cls: 'cipher-guide__tag--digit' });
  if (p.accents) changes.push({ label: `${plural(p.accents, 'accent')} removed`, cls: 'cipher-guide__tag--accent' });
  if (p.spacesRemoved) changes.push({ label: `${plural(p.spacesRemoved, 'space')} removed` });
  if (p.otherRemoved.length) {
    const unique = Array.from(new Set(p.otherRemoved));
    const shown = unique.slice(0, 6).join(' ') + (unique.length > 6 ? ' …' : '');
    changes.push({ label: `Removed ${shown}`, cls: 'cipher-guide__tag--removed' });
  }
  return changes;
});

const isStale = computed(() => {
  const r = result.value;
  if (!r) return false;
  return (
    r.type !== cipherType.value ||
    r.mode !== mode.value ||
    r.format !== format.value ||
    r.key !== currentKey.value ||
    r.input !== inputText.value
  );
});

async function run() {
  if (!canRun.value) return;
  const output = runCipher(cipherType.value, mode.value, inputText.value, currentKey.value, format.value);
  result.value = {
    ...output,
    type: cipherType.value,
    mode: mode.value,
    format: format.value,
    key: currentKey.value,
    input: inputText.value,
  };
  addHistoryEntry({
    type: cipherType.value,
    mode: mode.value,
    format: format.value,
    key: currentKey.value,
    input: inputText.value,
    output: output.output,
  });
  Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);

  await nextTick();
  resultEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function swap() {
  if (!result.value) return;
  const { output, mode: lastMode, type, key, format: lastFormat } = result.value;
  cipherType.value = type;
  format.value = lastFormat;
  applyKey(type, key);
  inputText.value = output;
  mode.value = lastMode === 'encrypt' ? 'decrypt' : 'encrypt';
  run();
}

function applyKey(type: CipherType, key: string) {
  if (type === 'caesar') shift.value = Number(key);
  else keyword.value = key;
}

function fillExample() {
  const caesarExample = 'Meet me at the library, 3 PM!';
  if (mode.value === 'encrypt') {
    inputText.value = cipherType.value === 'caesar' ? caesarExample : 'Attack at dawn!';
  } else if (format.value === 'strict') {
    inputText.value =
      cipherType.value === 'caesar' ? runCipher('caesar', 'encrypt', caesarExample, 3, 'strict').output : 'LXFOP VEFRN HR';
  } else {
    inputText.value = cipherType.value === 'caesar' ? 'Phhw ph dw wkh oleudub, 3 SP!' : 'Lxfopv ef rnhr!';
  }
  if (cipherType.value === 'caesar') shift.value = 3;
  else keyword.value = 'LEMON';
}

function openEntry(entry: CipherHistoryEntry) {
  const entryFormat = entry.format ?? 'lenient';
  cipherType.value = entry.type;
  mode.value = entry.mode;
  format.value = entryFormat;
  applyKey(entry.type, entry.key);
  inputText.value = entry.input;
  view.value = 'workspace';
  result.value = {
    ...runCipher(entry.type, entry.mode, entry.input, entry.key, entryFormat),
    type: entry.type,
    mode: entry.mode,
    format: entryFormat,
    key: entry.key,
    input: entry.input,
  };
  contentEl.value?.$el.scrollToTop(0);
}

async function deleteEntry(entry: CipherHistoryEntry) {
  const undo = removeHistoryEntry(entry.id);
  const toast = await toastController.create({
    message: 'Entry deleted',
    duration: 4000,
    position: 'bottom',
    positionAnchor: 'cipher-tab-bar',
    cssClass: 'app-toast',
    buttons: [{ text: 'Undo', handler: undo }],
  });
  await toast.present();
}

async function confirmClear() {
  const alert = await alertController.create({
    header: 'Clear history',
    message: `Delete all ${cipherHistory.value.length} entries? This cannot be undone.`,
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'Clear all', role: 'destructive', handler: clearHistory },
    ],
  });
  await alert.present();
}

async function copy(text: string) {
  let ok = false;
  try {
    await navigator.clipboard.writeText(text);
    ok = true;
  } catch {
    // Fallback for WebViews / insecure contexts without the async clipboard API.
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    ok = document.execCommand('copy');
    area.remove();
  }
  const toast = await toastController.create({
    message: ok ? 'Copied to clipboard' : 'Could not copy — select the text manually',
    duration: 1500,
    position: 'bottom',
    positionAnchor: 'cipher-tab-bar',
    cssClass: 'app-toast',
  });
  await toast.present();
}

function summarize(entry: { type: CipherType; key: string; format?: CipherFormat }): string {
  const cipher = entry.type === 'caesar' ? `Caesar · shift ${entry.key}` : `Vigenère · key ${entry.key.toUpperCase()}`;
  return `${cipher} · ${entry.format === 'strict' ? 'Strict' : 'Lenient'}`;
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
</script>

<style scoped>
.cipher-page {
  max-width: 720px;
  margin: 0 auto;
  padding: 16px 12px 32px;
}

.cipher-card {
  padding: 16px;
  margin-bottom: 14px;
}

.cipher-card .app-field {
  margin-bottom: 8px;
}

.cipher-label {
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--ion-color-medium);
}

.cipher-note {
  margin: 0 4px 14px;
  font-size: 13px;
  color: var(--ion-color-medium);
}

.cipher-mode {
  margin-bottom: 16px;
}

.cipher-format {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 4px 6px;
}

.cipher-format__toggle {
  flex: 1;
}

.cipher-format__toggle ion-segment-button {
  min-height: 36px;
  text-transform: none;
}

.cipher-preview {
  margin-bottom: 12px;
  padding: 12px 14px;
  border: 1.5px dashed rgba(var(--ion-color-primary-rgb), 0.5);
  border-radius: var(--app-radius-sm);
}

.cipher-preview__title {
  display: flex;
  justify-content: space-between;
  margin: 0 0 6px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--ion-color-primary);
}

.cipher-preview__text {
  margin: 0;
  font-family: var(--app-mono-font);
  font-size: 16px;
  letter-spacing: 0.06em;
  word-break: break-all;
}

.cipher-preview__part--digit {
  border-radius: 4px;
  background: rgba(var(--ion-color-warning-rgb), 0.35);
}

.cipher-preview__part--accent {
  border-radius: 4px;
  background: rgba(var(--ion-color-secondary-rgb), 0.3);
}

.cipher-preview__empty {
  margin: 0;
  font-size: 13px;
  color: var(--ion-color-danger-shade);
}

.cipher-preview__changes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.cipher-mode ion-segment-button {
  --layout: icon-start;
  min-height: 44px;
  text-transform: none;
}

.cipher-key__head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  padding: 0 4px;
}

.cipher-key__preview {
  font-family: var(--app-mono-font);
  font-size: 13px;
  color: var(--ion-color-primary);
}

.cipher-shift {
  display: flex;
  align-items: center;
  gap: 2px;
}

.cipher-shift ion-range {
  flex: 1;
  padding: 0 4px;
  --bar-background-active: var(--ion-color-primary);
}

.cipher-shift__value {
  min-width: 40px;
  padding: 6px 0;
  border-radius: var(--app-radius-sm);
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  font-family: var(--app-mono-font);
  font-size: 18px;
  font-weight: 700;
  text-align: center;
}

.cipher-key-letters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 0 4px;
}

.cipher-key-letter {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 32px;
  padding: 4px 6px;
  border-radius: 10px;
  background: rgba(var(--ion-color-secondary-rgb), 0.2);
  font-family: var(--app-mono-font);
  line-height: 1.2;
}

.cipher-key-letter small {
  font-size: 11px;
  color: var(--ion-color-medium);
}

.cipher-error {
  margin: 4px 4px 0;
  font-size: 13px;
  color: var(--ion-color-danger-shade);
}

.cipher-field ion-textarea {
  --padding-bottom: 10px;
}

.cipher-field :deep(textarea) {
  font-family: var(--app-mono-font);
}

.cipher-input-actions {
  display: flex;
  justify-content: space-between;
  margin: -4px 0 6px;
}

.cipher-input-actions ion-button {
  text-transform: none;
  margin: 0;
}

.cipher-guide {
  padding: 12px 14px;
  border-radius: var(--app-radius-sm);
  background: rgba(var(--ion-color-primary-rgb), 0.08);
  font-size: 13px;
}

.cipher-guide__title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 6px;
  font-weight: 700;
}

.cipher-guide ul {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 6px;
}

.cipher-guide__tag {
  display: inline-block;
  margin-right: 4px;
  padding: 1px 8px;
  border-radius: 999px;
  background: rgba(var(--ion-color-medium-rgb), 0.2);
  font-family: var(--app-mono-font);
  font-size: 12px;
}

.cipher-guide__tag--digit {
  background: rgba(var(--ion-color-warning-rgb), 0.35);
}

.cipher-guide__tag--accent {
  background: rgba(var(--ion-color-secondary-rgb), 0.3);
}

.cipher-guide__tag--removed {
  background: rgba(var(--ion-color-danger-rgb), 0.2);
}

.cipher-guide__tag--yes {
  background: rgba(var(--ion-color-tertiary-rgb), 0.35);
  font-weight: 700;
}

.cipher-guide__stats {
  margin: 10px 0 0;
  color: var(--ion-color-medium-shade);
}

.cipher-run {
  margin-top: 16px;
  min-height: 48px;
}

.cipher-result {
  border-color: rgba(var(--ion-color-primary-rgb), 0.45);
}

.cipher-result__head {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 4px 12px;
}

.cipher-result__meta {
  font-size: 13px;
  color: var(--ion-color-medium);
}

.cipher-output {
  margin: 10px 0;
  padding: 12px 14px;
  border-radius: var(--app-radius-sm);
  background: var(--ion-color-light);
  font-family: var(--app-mono-font);
  font-size: 17px;
  white-space: pre-wrap;
  word-break: break-word;
  user-select: text;
  -webkit-user-select: text;
}

.cipher-stale {
  margin: 0 0 10px;
  font-size: 13px;
  color: var(--ion-color-warning-shade);
}

.cipher-result__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cipher-result__actions ion-button {
  margin: 0;
  text-transform: none;
  --border-radius: var(--app-radius-sm);
}

.cipher-history-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.cipher-history-head ion-button {
  flex-shrink: 0;
  margin: 0;
  text-transform: none;
  font-weight: 600;
}

.cipher-history-head p {
  margin: 0;
  font-size: 13px;
}

.cipher-history-card {
  position: relative;
  margin-bottom: 12px;
  padding: 14px 44px 12px 16px;
  cursor: pointer;
  transition: transform 0.15s ease;
}

.cipher-history-card:active {
  transform: scale(0.98);
}

.cipher-history-card__tags {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--ion-color-medium);
}

.cipher-history-card__tags ion-badge {
  border-radius: 999px;
  --padding-start: 8px;
  --padding-end: 8px;
}

.cipher-history-card__text {
  margin: 0;
  font-family: var(--app-mono-font);
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cipher-history-card__text--out {
  margin-top: 2px;
  font-weight: 700;
  color: var(--ion-color-primary);
}

.cipher-history-card__time {
  margin: 8px 0 0;
  font-size: 12px;
  color: var(--ion-color-medium);
}
</style>
