// Classical Caesar and Vigenère ciphers.
//
// Only the 26 English letters (A–Z, a–z) are transformed; letter case is
// kept. Every other character (spaces, digits, punctuation, accented letters,
// emoji…) passes through unchanged. For Vigenère the key only advances on
// letters, so "HELLO WORLD" with key "KEY" pairs W with K, not with a space.

export type CipherType = 'caesar' | 'vigenere';
export type CipherMode = 'encrypt' | 'decrypt';

export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export interface CipherStep {
  input: string;
  output: string;
  /** False for characters that were kept as-is. */
  isLetter: boolean;
  /** 0–25 position of the input letter (A = 0). */
  inIndex?: number;
  /** 0–25 position of the output letter. */
  outIndex?: number;
  /** Shift applied (always 0–25, before the encrypt/decrypt sign). */
  shift?: number;
  /** Vigenère only: the key letter that produced the shift. */
  keyChar?: string;
  /** The raw sum/difference before mod 26, to show wrap-around. */
  raw?: number;
}

export interface CipherResult {
  output: string;
  steps: CipherStep[];
  letterCount: number;
}

export function isLetter(char: string): boolean {
  return /^[A-Za-z]$/.test(char);
}

export function mod26(n: number): number {
  return ((n % 26) + 26) % 26;
}

/** Returns an error message, or null when the key is usable. */
export function validateKey(type: CipherType, key: string | number): string | null {
  if (type === 'caesar') {
    const shift = Number(key);
    if (!Number.isInteger(shift)) return 'Shift must be a whole number.';
    if (shift < 1 || shift > 25) return 'Shift must be between 1 and 25.';
    return null;
  }
  const word = String(key).trim();
  if (!word) return 'Enter a keyword.';
  if (!/^[A-Za-z]+$/.test(word)) return 'Keyword can only contain letters A–Z.';
  return null;
}

function shiftLetter(char: string, shift: number, mode: CipherMode): CipherStep {
  const upper = char.toUpperCase();
  const inIndex = ALPHABET.indexOf(upper);
  const raw = mode === 'encrypt' ? inIndex + shift : inIndex - shift;
  const outIndex = mod26(raw);
  const outUpper = ALPHABET[outIndex];
  const output = char === upper ? outUpper : outUpper.toLowerCase();
  return { input: char, output, isLetter: true, inIndex, outIndex, shift, raw };
}

function passThrough(char: string): CipherStep {
  return { input: char, output: char, isLetter: false };
}

export function caesar(text: string, shift: number, mode: CipherMode): CipherResult {
  const k = mod26(shift);
  // Array.from splits by code point so emoji aren't broken into halves.
  const steps = Array.from(text, (char) => (isLetter(char) ? shiftLetter(char, k, mode) : passThrough(char)));
  return toResult(steps);
}

export function vigenere(text: string, key: string, mode: CipherMode): CipherResult {
  const keyLetters = key.toUpperCase().replace(/[^A-Z]/g, '');
  if (!keyLetters) throw new Error('Keyword must contain at least one letter.');

  let keyPos = 0;
  const steps = Array.from(text, (char) => {
    if (!isLetter(char)) return passThrough(char);
    const keyChar = keyLetters[keyPos % keyLetters.length];
    keyPos += 1;
    return { ...shiftLetter(char, ALPHABET.indexOf(keyChar), mode), keyChar };
  });
  return toResult(steps);
}

export function runCipher(
  type: CipherType,
  mode: CipherMode,
  text: string,
  key: string | number
): CipherResult {
  const error = validateKey(type, key);
  if (error) throw new Error(error);
  return type === 'caesar' ? caesar(text, Number(key), mode) : vigenere(text, String(key), mode);
}

function toResult(steps: CipherStep[]): CipherResult {
  return {
    output: steps.map((s) => s.output).join(''),
    steps,
    letterCount: steps.filter((s) => s.isLetter).length,
  };
}

/** Counts how many characters will be transformed vs. kept as-is. */
export function analyzeText(text: string): { letters: number; kept: number; keptChars: string[] } {
  const chars = Array.from(text);
  const kept = chars.filter((c) => !isLetter(c));
  const visible = Array.from(new Set(kept.filter((c) => c.trim() !== '')));
  return { letters: chars.length - kept.length, kept: kept.length, keptChars: visible };
}
