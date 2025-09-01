import { randomBytes } from 'crypto';

/**
 * Generates a cryptographically secure random number between 0 and 1.
 * This is a drop-in replacement for Math.random() that uses the crypto module
 * for better security in applications that require unpredictable random values.
 *
 * @returns A random number between 0 (inclusive) and 1 (exclusive)
 */
export function cryptoRandom(): number {
  return randomBytes(4).readUInt32BE(0) / 0x100000000;
}
