<template>
  <div class="cipher-steps">
    <p class="cipher-steps__formula">
      <template v-if="type === 'caesar'">
        {{ mode === 'encrypt' ? 'C' : 'P' }} = ({{ mode === 'encrypt' ? 'P +' : 'C −' }} k) mod 26
      </template>
      <template v-else>
        {{ mode === 'encrypt' ? 'Cᵢ' : 'Pᵢ' }} = ({{ mode === 'encrypt' ? 'Pᵢ +' : 'Cᵢ −' }} Kᵢ) mod 26
      </template>
      <span>A=0, B=1 … Z=25</span>
    </p>

    <p class="cipher-steps__hint">Tap a letter to see how it was transformed.</p>

    <div class="cipher-tiles" role="list">
      <button
        v-for="(step, index) in visibleSteps"
        :key="index"
        type="button"
        role="listitem"
        class="cipher-tile"
        :class="{
          'cipher-tile--kept': !step.isLetter,
          'cipher-tile--space': step.input.trim() === '',
          'cipher-tile--active': index === selectedIndex,
        }"
        :disabled="!step.isLetter"
        :aria-label="describe(step)"
        @click="selectedIndex = index"
      >
        <span v-if="type === 'vigenere'" class="cipher-tile__key">{{ step.keyChar ?? '' }}</span>
        <span class="cipher-tile__in">{{ display(step.input) }}</span>
        <span class="cipher-tile__arrow">{{ step.isLetter ? '↓' : '·' }}</span>
        <span class="cipher-tile__out">{{ display(step.output) }}</span>
      </button>
    </div>
    <p v-if="steps.length > MAX_TILES" class="cipher-steps__hint">
      Showing the first {{ MAX_TILES }} of {{ steps.length }} characters.
    </p>

    <div v-if="selected" class="cipher-detail">
      <div class="cipher-detail__equation">
        <div class="cipher-detail__row">
          <span class="cipher-chip">{{ selected.input.toUpperCase() }}</span>
          <span>is letter #{{ selected.inIndex }}</span>
        </div>
        <div class="cipher-detail__row">
          <span class="cipher-chip cipher-chip--key">{{ mode === 'encrypt' ? '+' : '−' }}{{ selected.shift }}</span>
          <span v-if="type === 'caesar'">shift k = {{ selected.shift }}</span>
          <span v-else>key letter {{ selected.keyChar }} = {{ selected.shift }}</span>
        </div>
        <div class="cipher-detail__row">
          <span class="cipher-chip cipher-chip--math">
            {{ selected.inIndex }} {{ mode === 'encrypt' ? '+' : '−' }} {{ selected.shift }} = {{ selected.raw }}
          </span>
          <span v-if="wrapNote">{{ wrapNote }}</span>
        </div>
        <div class="cipher-detail__row">
          <span class="cipher-chip cipher-chip--out">{{ selected.output.toUpperCase() }}</span>
          <span>{{ selected.raw }} mod 26 = {{ selected.outIndex }} → {{ selected.output.toUpperCase() }}</span>
        </div>
      </div>

      <div class="cipher-alphabet" ref="alphabetEl">
        <div class="cipher-alphabet__labels">
          <span>Plain</span>
          <span class="cipher-alphabet__arrow">&nbsp;</span>
          <span>Cipher</span>
        </div>
        <div
          v-for="(letter, i) in ALPHABET"
          :key="letter"
          class="cipher-alphabet__col"
          :class="{ 'cipher-alphabet__col--active': i === activeColumn }"
          :data-col="i"
        >
          <span :class="{ 'cipher-alphabet__from': mode === 'encrypt' && i === activeColumn }">{{ letter }}</span>
          <span class="cipher-alphabet__arrow">{{ mode === 'encrypt' ? '↓' : '↑' }}</span>
          <span :class="{ 'cipher-alphabet__from': mode === 'decrypt' && i === activeColumn }">
            {{ ALPHABET[(i + (selected.shift ?? 0)) % 26] }}
          </span>
        </div>
      </div>
      <p class="cipher-steps__hint">
        <template v-if="mode === 'encrypt'">
          Find <b>{{ selected.input.toUpperCase() }}</b> in the Plain row and read the letter below it.
        </template>
        <template v-else>
          Find <b>{{ selected.input.toUpperCase() }}</b> in the Cipher row and read the letter above it.
        </template>
        <template v-if="type === 'vigenere'"> This row is for key letter {{ selected.keyChar }}.</template>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { ALPHABET, type CipherMode, type CipherStep, type CipherType } from '../services/cipher';

const MAX_TILES = 150;

const props = defineProps<{
  steps: CipherStep[];
  type: CipherType;
  mode: CipherMode;
}>();

const visibleSteps = computed(() => props.steps.slice(0, MAX_TILES));
const selectedIndex = ref(-1);
const alphabetEl = ref<HTMLElement | null>(null);

watch(
  () => props.steps,
  (steps) => {
    selectedIndex.value = steps.findIndex((s) => s.isLetter);
  },
  { immediate: true }
);

const selected = computed(() => {
  const step = props.steps[selectedIndex.value];
  return step?.isLetter ? step : null;
});

// Column in the alphabet table where the transformation happens: the plain
// letter's column when encrypting, the plain (output) column when decrypting.
const activeColumn = computed(() => {
  if (!selected.value) return -1;
  return props.mode === 'encrypt' ? selected.value.inIndex! : selected.value.outIndex!;
});

const wrapNote = computed(() => {
  const raw = selected.value?.raw ?? 0;
  if (raw > 25) return 'past Z, so it wraps back to A';
  if (raw < 0) return 'before A, so it wraps around to Z';
  return '';
});

watch(activeColumn, async (col) => {
  await nextTick();
  const el = alphabetEl.value?.querySelector<HTMLElement>(`[data-col="${col}"]`);
  el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
});

function display(char: string): string {
  if (char === ' ') return '␣';
  if (char === '\n') return '↵';
  if (char === '\t') return '⇥';
  return char;
}

function describe(step: CipherStep): string {
  if (!step.isLetter) return `${display(step.input)} kept as-is`;
  return `${step.input} becomes ${step.output}`;
}
</script>

<style scoped>
.cipher-steps__formula {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 12px;
  margin: 0 0 6px;
  font-family: var(--app-mono-font);
  font-size: 15px;
  font-weight: 700;
  color: var(--ion-color-primary);
}

.cipher-steps__formula span {
  font-size: 12px;
  font-weight: 500;
  color: var(--ion-color-medium);
}

.cipher-steps__hint {
  margin: 6px 0 10px;
  font-size: 13px;
  color: var(--ion-color-medium);
}

.cipher-tiles {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  max-height: 260px;
  overflow-y: auto;
  padding: 2px;
}

.cipher-tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 34px;
  padding: 6px 4px;
  border: 1.5px solid transparent;
  border-radius: 10px;
  background: var(--ion-color-light);
  color: var(--ion-text-color);
  font-family: var(--app-mono-font);
  line-height: 1.15;
  cursor: pointer;
  transition: transform 0.12s ease, border-color 0.12s ease;
}

.cipher-tile:not(:disabled):active {
  transform: scale(0.94);
}

.cipher-tile--active {
  border-color: var(--ion-color-primary);
  background: rgba(var(--ion-color-primary-rgb), 0.14);
}

.cipher-tile--kept {
  opacity: 0.45;
  cursor: default;
}

.cipher-tile--space {
  min-width: 20px;
}

.cipher-tile__key {
  min-height: 14px;
  font-size: 11px;
  font-weight: 700;
  color: var(--ion-color-secondary-shade);
}

.cipher-tile__in {
  font-size: 16px;
}

.cipher-tile__arrow {
  font-size: 10px;
  color: var(--ion-color-medium);
}

.cipher-tile__out {
  font-size: 16px;
  font-weight: 700;
  color: var(--ion-color-primary);
}

.cipher-detail {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px dashed rgba(var(--ion-color-medium-rgb), 0.4);
}

.cipher-detail__equation {
  display: grid;
  gap: 8px;
  margin-bottom: 14px;
}

.cipher-detail__row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}

.cipher-chip {
  min-width: 44px;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--ion-color-light);
  font-family: var(--app-mono-font);
  font-weight: 700;
  text-align: center;
}

.cipher-chip--key {
  background: rgba(var(--ion-color-secondary-rgb), 0.22);
}

.cipher-chip--math {
  background: rgba(var(--ion-color-warning-rgb), 0.25);
}

.cipher-chip--out {
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
}

.cipher-alphabet {
  display: flex;
  gap: 2px;
  overflow-x: auto;
  padding-bottom: 6px;
  font-family: var(--app-mono-font);
  scrollbar-width: thin;
}

.cipher-alphabet__labels,
.cipher-alphabet__col {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  padding: 6px 0;
  gap: 2px;
}

.cipher-alphabet__labels {
  position: sticky;
  left: 0;
  z-index: 1;
  padding-right: 6px;
  align-items: flex-start;
  background: var(--ion-background-color);
  font-family: inherit;
  font-size: 11px;
  line-height: 21px;
  font-weight: 600;
  color: var(--ion-color-medium);
}

.cipher-alphabet__col {
  width: 26px;
  border-radius: 8px;
  font-size: 14px;
  line-height: 21px;
}

.cipher-alphabet__arrow {
  font-size: 10px;
  color: var(--ion-color-medium);
}

.cipher-alphabet__col--active {
  background: var(--ion-color-primary);
  color: var(--ion-color-primary-contrast);
  font-weight: 700;
}

.cipher-alphabet__col--active .cipher-alphabet__arrow {
  color: inherit;
}

.cipher-alphabet__from {
  text-decoration: underline;
  text-underline-offset: 3px;
}
</style>
