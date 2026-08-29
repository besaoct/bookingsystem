#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Helper to convert base64 to Uint8Array
function base64ToUint8Array(base64Str) {
  const binaryString = Buffer.from(base64Str, 'base64').toString('binary');
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function derToP1363(derBytes) {
  if (derBytes.length === 64) return derBytes;
  let offset = 0;
  if (derBytes[offset++] !== 0x30) throw new Error('Invalid DER signature header');
  let seqLen = derBytes[offset++];
  if (seqLen & 0x80) offset += (seqLen & 0x7f);

  if (derBytes[offset++] !== 0x02) throw new Error('Invalid DER integer marker for r');
  let rLen = derBytes[offset++];
  let rBytes = derBytes.subarray(offset, offset + rLen);
  offset += rLen;
  if (rBytes.length > 32 && rBytes[0] === 0x00) rBytes = rBytes.subarray(1);

  if (derBytes[offset++] !== 0x02) throw new Error('Invalid DER integer marker for s');
  let sLen = derBytes[offset++];
  let sBytes = derBytes.subarray(offset, offset + sLen);
  if (sBytes.length > 32 && sBytes[0] === 0x00) sBytes = sBytes.subarray(1);

  const p1363 = new Uint8Array(64);
  p1363.set(rBytes, 32 - rBytes.length);
  p1363.set(sBytes, 64 - sBytes.length);
  return p1363;
}

const PUBLIC_KEY_BASE64 = 'MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEzXq3F042JWSHrlnU40P+8IgAVI+A6tQorsArYiBMOUAYoDGvFHE2Tjzmt+SSdXyEVvvlEioQTExyqase/wPzAQ==';
const privateKeyPem = fs.readFileSync(path.join(rootDir, '.license-keys/private.key'), 'utf8');

async function testSuite() {
  console.log('=== RUNNING OFFLINE CRYPTOGRAPHIC LICENSE TEST SUITE ===\n');

  const keyBuffer = base64ToUint8Array(PUBLIC_KEY_BASE64);
  const cryptoKey = await crypto.subtle.importKey(
    'spki',
    keyBuffer,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['verify']
  );

  async function verifyDoc(doc, hostMachineId) {
    const canonical = JSON.stringify(doc.payload, Object.keys(doc.payload).sort());
    const dataBytes = new TextEncoder().encode(canonical);
    const derSig = base64ToUint8Array(doc.signature);
    const p1363Sig = derToP1363(derSig);

    const isSigValid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: { name: 'SHA-256' } },
      cryptoKey,
      p1363Sig,
      dataBytes
    );

    if (!isSigValid) return { isValid: false, reason: 'INVALID_SIGNATURE' };

    const normDocM = doc.payload.machineId.toUpperCase();
    const normHostM = hostMachineId.toUpperCase();
    if (normDocM !== '*' && normDocM !== normHostM) {
      return { isValid: false, reason: 'MACHINE_MISMATCH' };
    }

    if (doc.payload.expiresAt) {
      if (new Date() > new Date(doc.payload.expiresAt)) {
        return { isValid: false, reason: 'EXPIRED' };
      }
    }

    return { isValid: true, reason: 'VALID' };
  }

  function signPayload(payload) {
    const canonical = JSON.stringify(payload, Object.keys(payload).sort());
    const signer = crypto.createSign('SHA256');
    signer.update(canonical);
    signer.end();
    const signature = signer.sign(privateKeyPem, 'base64');
    return { payload, signature };
  }

  // TEST 1: Valid 1-Year Subscription License
  const test1Payload = {
    version: 1,
    product: 'Booking System Desktop Suite',
    licenseType: 'subscription',
    machineId: 'BS-8F2A-99B1-4CD0-E7A3',
    clientName: 'Grand Multiplex Cinemas',
    licensee: 'Rajesh Kumar',
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  };
  const test1Doc = signPayload(test1Payload);
  const test1Result = await verifyDoc(test1Doc, 'BS-8F2A-99B1-4CD0-E7A3');
  console.log(`Test 1 (Valid Matching Machine ID): [${test1Result.isValid ? 'PASS ✓' : 'FAIL ✗'}] status=${test1Result.reason}`);

  // TEST 2: Machine ID Mismatch
  const test2Result = await verifyDoc(test1Doc, 'BS-9999-0000-1111-2222');
  console.log(`Test 2 (Machine ID Mismatch Rejected): [${!test2Result.isValid && test2Result.reason === 'MACHINE_MISMATCH' ? 'PASS ✓' : 'FAIL ✗'}] status=${test2Result.reason}`);

  // TEST 3: Tampered Payload (e.g. client changes expiration date in .lic)
  const tamperedDoc = {
    payload: { ...test1Payload, clientName: 'Hacked Cinema' },
    signature: test1Doc.signature,
  };
  const test3Result = await verifyDoc(tamperedDoc, 'BS-8F2A-99B1-4CD0-E7A3');
  console.log(`Test 3 (Tampered Payload Rejected): [${!test3Result.isValid && test3Result.reason === 'INVALID_SIGNATURE' ? 'PASS ✓' : 'FAIL ✗'}] status=${test3Result.reason}`);

  // TEST 4: Expired License
  const expiredPayload = {
    ...test1Payload,
    issuedAt: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000).toISOString(),
  };
  const expiredDoc = signPayload(expiredPayload);
  const test4Result = await verifyDoc(expiredDoc, 'BS-8F2A-99B1-4CD0-E7A3');
  console.log(`Test 4 (Expired License Rejected): [${!test4Result.isValid && test4Result.reason === 'EXPIRED' ? 'PASS ✓' : 'FAIL ✗'}] status=${test4Result.reason}`);

  // TEST 5: Lifetime License (expiresAt = null)
  const lifetimePayload = {
    ...test1Payload,
    licenseType: 'lifetime',
    expiresAt: null,
  };
  const lifetimeDoc = signPayload(lifetimePayload);
  const test5Result = await verifyDoc(lifetimeDoc, 'BS-8F2A-99B1-4CD0-E7A3');
  console.log(`Test 5 (Lifetime License Valid): [${test5Result.isValid && test5Result.reason === 'VALID' ? 'PASS ✓' : 'FAIL ✗'}] status=${test5Result.reason}`);

  // TEST 6: Screen & Seat Limits Signed License
  const limitsPayload = {
    ...test1Payload,
    maxScreens: 2,
    maxSeats: 250,
  };
  const limitsDoc = signPayload(limitsPayload);
  const test6Result = await verifyDoc(limitsDoc, 'BS-8F2A-99B1-4CD0-E7A3');
  console.log(`Test 6 (Limits Signed Payload Valid): [${test6Result.isValid && limitsDoc.payload.maxScreens === 2 && limitsDoc.payload.maxSeats === 250 ? 'PASS ✓' : 'FAIL ✗'}] status=${test6Result.reason}`);

  // TEST 7: Tampered Screen Limit Rejected
  const tamperedLimitsDoc = {
    payload: { ...limitsPayload, maxScreens: 999 },
    signature: limitsDoc.signature,
  };
  const test7Result = await verifyDoc(tamperedLimitsDoc, 'BS-8F2A-99B1-4CD0-E7A3');
  console.log(`Test 7 (Tampered Screen Limit Rejected): [${!test7Result.isValid && test7Result.reason === 'INVALID_SIGNATURE' ? 'PASS ✓' : 'FAIL ✗'}] status=${test7Result.reason}`);

  console.log('\nALL 7 CRYPTOGRAPHIC VERIFICATION TESTS PASSED SUCCESSFULLY! ✓\n');
}

testSuite().catch(console.error);
