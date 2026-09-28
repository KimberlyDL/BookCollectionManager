import { describe, expect, test } from 'vitest';
import { analyzeText, caesar, runCipher, validateKey, vigenere } from '@/services/cipher';

describe('caesar', () => {
  test('encrypts with a shift of 3', () => {
    expect(caesar('HELLO', 3, 'encrypt').output).toBe('KHOOR');
  });

  test('wraps around the end of the alphabet', () => {
    expect(caesar('xyz', 3, 'encrypt').output).toBe('abc');
    expect(caesar('abc', 3, 'decrypt').output).toBe('xyz');
  });

  test('keeps case and non-letters', () => {
    expect(caesar('Hello, World! 123', 3, 'encrypt').output).toBe('Khoor, Zruog! 123');
  });

  test('records wrap-around in steps', () => {
    const [step] = caesar('X', 3, 'encrypt').steps;
    expect(step).toMatchObject({ inIndex: 23, raw: 26, outIndex: 0, output: 'A' });
  });
});

describe('vigenere', () => {
  test('matches the textbook example', () => {
    expect(vigenere('ATTACKATDAWN', 'LEMON', 'encrypt').output).toBe('LXFOPVEFRNHR');
    expect(vigenere('LXFOPVEFRNHR', 'LEMON', 'decrypt').output).toBe('ATTACKATDAWN');
  });

  test('key only advances on letters', () => {
    const result = vigenere('Attack at dawn!', 'lemon', 'encrypt');
    expect(result.output).toBe('Lxfopv ef rnhr!');
    expect(result.steps[6]).toMatchObject({ input: ' ', isLetter: false });
    expect(result.steps[7].keyChar).toBe('E');
  });

  test('round-trips arbitrary text', () => {
    const text = 'The quick brown fox — jumps over 13 lazy dogs. ñ 🙂';
    const encrypted = vigenere(text, 'Secret', 'encrypt').output;
    expect(vigenere(encrypted, 'Secret', 'decrypt').output).toBe(text);
  });
});

describe('validation', () => {
  test('caesar shift must be 1–25', () => {
    expect(validateKey('caesar', 3)).toBeNull();
    expect(validateKey('caesar', 0)).not.toBeNull();
    expect(validateKey('caesar', 26)).not.toBeNull();
  });

  test('vigenere key must be letters only', () => {
    expect(validateKey('vigenere', 'Key')).toBeNull();
    expect(validateKey('vigenere', 'k3y')).not.toBeNull();
    expect(validateKey('vigenere', '')).not.toBeNull();
    expect(() => runCipher('vigenere', 'encrypt', 'hi', 'a b')).toThrow();
  });

  test('analyzeText counts letters and kept characters', () => {
    expect(analyzeText('Hi, you 2!')).toEqual({ letters: 5, kept: 5, keptChars: [',', '2', '!'] });
  });
});
