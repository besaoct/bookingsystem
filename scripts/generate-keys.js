#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const keysDir = path.join(rootDir, '.license-keys');

console.log('Generating ECDSA P-256 (prime256v1) Keypair for Booking System Licensing...\n');

if (!fs.existsSync(keysDir)) {
  fs.mkdirSync(keysDir, { recursive: true });
}

const privateKeyPath = path.join(keysDir, 'private.key');
const publicKeyPath = path.join(keysDir, 'public.key');

const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
  namedCurve: 'prime256v1',
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem',
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
  },
});

fs.writeFileSync(privateKeyPath, privateKey, { mode: 0o600 });
fs.writeFileSync(publicKeyPath, publicKey, { mode: 0o644 });

console.log('SUCCESS: Keypair Generated!');
console.log(`Private Key saved to: ${privateKeyPath} (DO NOT SHARE / COMMIT)`);
console.log(`Public Key saved to:  ${publicKeyPath}\n`);

console.log('--- PUBLIC KEY (SPKI PEM) ---');
console.log(publicKey.trim());
console.log('-----------------------------\n');
