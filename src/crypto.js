/* ============================================================
   crypto.js — browser side of the encrypted-data scheme.
   Mirrors scripts/encrypt.mjs exactly: PBKDF2-SHA256 → AES-256-GCM,
   all via the native Web Crypto API (no bundled crypto lib).

   decryptData(envelope, password) → the parsed JSON, or throws
   WrongPasswordError if the password doesn't authenticate.
   ============================================================ */

// Pinned to scripts/encrypt.mjs — both sides MUST agree on these.
const ITERATIONS = 600_000;
const ENVELOPE_VERSION = 1;

export class WrongPasswordError extends Error {
  constructor() {
    super("wrong-password");
    this.name = "WrongPasswordError";
  }
}

export class CryptoUnavailableError extends Error {
  constructor() {
    super("crypto-unavailable");
    this.name = "CryptoUnavailableError";
  }
}

const b64ToBytes = (s) =>
  Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function deriveKey(password, salt, iterations) {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
}

/**
 * @param {object} envelope  parsed data/casa.enc.json
 * @param {string} password
 * @returns {Promise<object>} the decrypted, parsed calendar JSON
 */
export async function decryptData(envelope, password) {
  // Web Crypto needs a secure context (https or localhost). On plain http
  // crypto.subtle is undefined — fail loudly instead of cryptically.
  if (!globalThis.isSecureContext || !globalThis.crypto?.subtle) {
    throw new CryptoUnavailableError();
  }
  if (envelope.v !== ENVELOPE_VERSION) {
    throw new Error(`unsupported envelope version: ${envelope.v}`);
  }
  if (envelope.iterations !== ITERATIONS) {
    throw new Error(`unexpected KDF iterations: ${envelope.iterations}`);
  }

  const salt = b64ToBytes(envelope.salt);
  const iv = b64ToBytes(envelope.iv);
  const ct = b64ToBytes(envelope.ct);
  const key = await deriveKey(password, salt, envelope.iterations);

  let plaintextBuf;
  try {
    // AES-GCM verifies the auth tag; a wrong key throws here.
    plaintextBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      ct
    );
  } catch {
    throw new WrongPasswordError();
  }

  const text = new TextDecoder().decode(plaintextBuf);
  return JSON.parse(text);
}
