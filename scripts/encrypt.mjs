#!/usr/bin/env node
/* ============================================================
   encrypt.mjs — turn data/casa.json into data/casa.enc.json.

   The site stays a plain static GitHub Pages app: we just ship
   the *ciphertext* instead of the plaintext. The browser asks for
   a password, derives the same key with Web Crypto, and decrypts.

   Crypto: PBKDF2-SHA256 (600k iters) → AES-256-GCM. These are the
   exact primitives crypto.subtle exposes in the browser, so the
   decrypt side (src/crypto.js) mirrors this 1:1.

   Password source (in order): $COSTA_PASSWORD, else a hidden TTY
   prompt. The plaintext casa.json is never committed (.gitignore);
   only casa.enc.json ships.
   ============================================================ */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "data", "casa.json");
const OUT = join(ROOT, "data", "casa.enc.json");

const ITERATIONS = 600_000; // OWASP 2023 floor for PBKDF2-SHA256
const b64 = (buf) => Buffer.from(buf).toString("base64");

async function readPassword() {
  const fromEnv = process.env.COSTA_PASSWORD;
  if (fromEnv && fromEnv.length > 0) return fromEnv;

  if (!process.stdin.isTTY) {
    throw new Error(
      "No password: set $COSTA_PASSWORD or run in an interactive terminal."
    );
  }
  // Hidden interactive prompt (no echo).
  process.stdout.write("Password to encrypt the calendar: ");
  return await new Promise((resolve, reject) => {
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let pw = "";
    const onData = (ch) => {
      const code = ch.charCodeAt(0);
      if (ch === "\n" || ch === "\r" || code === 4) {
        // enter / EOT
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener("data", onData);
        process.stdout.write("\n");
        resolve(pw);
      } else if (code === 3) {
        // ctrl-c
        stdin.setRawMode(false);
        process.stdout.write("\n");
        reject(new Error("aborted"));
      } else if (code === 127 || code === 8) {
        // backspace / delete
        pw = pw.slice(0, -1);
      } else {
        pw += ch;
      }
    };
    stdin.on("data", onData);
  });
}

async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: ITERATIONS, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
}

async function main() {
  const plaintext = await readFile(SRC); // Buffer of the raw JSON bytes
  // sanity: must be valid JSON so we never encrypt garbage
  JSON.parse(plaintext.toString("utf8"));

  const password = await readPassword();
  if (!password || password.length < 8) {
    throw new Error("Password too short — use at least 8 characters.");
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    plaintext
  );

  const envelope = {
    v: 1,
    kdf: "PBKDF2-SHA256",
    iterations: ITERATIONS,
    cipher: "AES-256-GCM",
    salt: b64(salt),
    iv: b64(iv),
    ct: b64(ct), // ciphertext with the 128-bit GCM tag appended
  };

  await writeFile(OUT, JSON.stringify(envelope) + "\n");
  console.log(
    `✓ encrypted data/casa.json → data/casa.enc.json ` +
      `(${plaintext.length} → ${b64(ct).length} b64 chars, ${ITERATIONS} iters)`
  );
}

main().catch((err) => {
  console.error(`✗ ${err.message}`);
  process.exit(1);
});
