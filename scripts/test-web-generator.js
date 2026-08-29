#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const privateKeyPem = fs.readFileSync(path.join(rootDir, '.license-keys/private.key'), 'utf8');

function pemToBinary(pem) {
  const lines = pem.trim().split(/\r?\n/);
  const clean = lines.filter(l => !l.startsWith('-----')).join('');
  return Buffer.from(clean, 'base64');
}

function p1363ToDer(p1363Bytes) {
  const r = p1363Bytes.subarray(0, 32);
  const s = p1363Bytes.subarray(32, 64);
  function encodeInt(bytes) {
    let start = 0;
    while (start < bytes.length && bytes[start] === 0) start++;
    const val = bytes.subarray(start);
    if (val.length === 0) return new Uint8Array([0x02, 0x01, 0x00]);
    if (val[0] & 0x80) {
      const out = new Uint8Array(val.length + 3);
      out[0] = 0x02;
      out[1] = val.length + 1;
      out[2] = 0x00;
      out.set(val, 3);
      return out;
    }
    const out = new Uint8Array(val.length + 2);
    out[0] = 0x02;
    out[1] = val.length;
    out.set(val, 2);
    return out;
  }
  const rEnc = encodeInt(r);
  const sEnc = encodeInt(s);
  const totalLen = rEnc.length + sEnc.length;
  const der = new Uint8Array(2 + totalLen);
  der[0] = 0x30;
  der[1] = totalLen;
  der.set(rEnc, 2);
  der.set(sEnc, 2 + rEnc.length);
  return der;
}

async function testWebSigning() {
  const keyBuffer = pemToBinary(privateKeyPem);
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const payload = {
    version: 1,
    product: 'Booking System Desktop Suite',
    licenseType: 'subscription',
    machineId: 'BS-8F2A-99B1-4CD0-E7A3',
    clientName: 'Web Tool Test Cinema',
    licensee: '',
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    maxScreens: 1,
    maxSeats: 50,
  };

  const canonical = JSON.stringify(payload, Object.keys(payload).sort());
  const dataBytes = new TextEncoder().encode(canonical);

  const p1363Sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: { name: 'SHA-256' } },
    privateKey,
    dataBytes
  );

  const derSig = p1363ToDer(new Uint8Array(p1363Sig));
  const signatureBase64 = Buffer.from(derSig).toString('base64');

  // Verify using Node.js crypto (which uses standard OpenSSL DER verify)
  const publicKeyPem = fs.readFileSync(path.join(rootDir, '.license-keys/public.key'), 'utf8');
  const verifier = crypto.createVerify('SHA256');
  verifier.update(canonical);
  verifier.end();
  const isValid = verifier.verify(publicKeyPem, signatureBase64, 'base64');

  console.log('Web Generator Cryptographic Compatibility Test (with limits):', isValid ? 'PASS ✓ (100% Compatible)' : 'FAIL ✗');
}

testWebSigning().catch(console.error);
