// Classical Caesar and Vigenère ciphers, in two formats:
//
// - strict (classical/textbook): the text is first reduced to UPPERCASE
//   letters — accents are stripped (é → E), digits are spelled out when
//   encrypting (3 → THREE), and spaces/punctuation are dropped. Ciphertext is
//   written in 5-letter groups so word lengths stay hidden.
// - lenient (modern tools): only A–Z/a–z are transformed and case is kept;
//   every other character (spaces, digits, punctuation, emoji…) passes
//   through unchanged.
//
// For Vigenère the key only advances on letters, so "HELLO WORLD" with key
// "KEY" pairs W with K, not with a space.

export type CipherType = 'caesar' | 'vigenere';
export type CipherMode = 'encrypt' | 'decrypt';
export type CipherFormat = 'strict' | 'lenient';

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
  key: string | number,
  format: CipherFormat = 'lenient'
): CipherResult {
  const error = validateKey(type, key);
  if (error) throw new Error(error);
  const source = format === 'strict' ? prepareStrictInput(text, mode).text : text;
  const result = type === 'caesar' ? caesar(source, Number(key), mode) : vigenere(source, String(key), mode);
  if (format === 'strict' && mode === 'encrypt') result.output = groupInFives(result.output);
  return result;
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

const DIGIT_WORDS = ['ZERO', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'];

export interface PreparedPart {
  text: string;
  /** The original character this part came from. */
  source: string;
  kind: 'letter' | 'digit' | 'accent';
}

export interface PreparedInput {
  /** Uppercase A–Z only — exactly what gets encrypted/decrypted. */
  text: string;
  parts: PreparedPart[];
  lowercase: number;
  digits: number;
  accents: number;
  spacesRemoved: number;
  otherRemoved: string[];
}

/**
 * Reduces text to the classical A–Z form. Digits are spelled out only when
 * encrypting; in ciphertext they can't be meaningful, so they're dropped.
 */
export function prepareStrictInput(text: string, mode: CipherMode): PreparedInput {
  const prepared: PreparedInput = {
    text: '',
    parts: [],
    lowercase: 0,
    digits: 0,
    accents: 0,
    spacesRemoved: 0,
    otherRemoved: [],
  };

  for (const char of Array.from(text)) {
    if (isLetter(char)) {
      if (char !== char.toUpperCase()) prepared.lowercase += 1;
      prepared.parts.push({ text: char.toUpperCase(), source: char, kind: 'letter' });
      continue;
    }
    const base = char.normalize('NFD').replace(/[̀-ͯ]/g, '');
    if (isLetter(base)) {
      prepared.accents += 1;
      prepared.parts.push({ text: base.toUpperCase(), source: char, kind: 'accent' });
    } else if (/^[0-9]$/.test(char) && mode === 'encrypt') {
      prepared.digits += 1;
      prepared.parts.push({ text: DIGIT_WORDS[Number(char)], source: char, kind: 'digit' });
    } else if (char.trim() === '') {
      prepared.spacesRemoved += 1;
    } else {
      prepared.otherRemoved.push(char);
    }
  }

  prepared.text = prepared.parts.map((p) => p.text).join('');
  return prepared;
}

export function groupInFives(text: string): string {
  return text.match(/.{1,5}/g)?.join(' ') ?? '';
}
