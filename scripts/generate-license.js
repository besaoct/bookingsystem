#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const keysDir = path.join(rootDir, '.license-keys');
const privateKeyPath = path.join(keysDir, 'private.key');

function printUsage() {
  console.log(`
Usage: npm run license:generate -- [options]

Options:
  --machine, -m     Client's Host PC Machine ID (e.g. BS-8F2A-99B1-4CD0-E7A3 or * for wildcard) [REQUIRED]
  --client, -c      Client / Cinema / Business Name (e.g. "Grand Multiplex") [REQUIRED]
  --licensee, -u    Contact Person / Licensee Name (optional)
  --days, -d        Validity period in days from today (default: 365)
  --minutes         Validity period in minutes from right now (for testing short expiry)
  --seconds         Validity period in seconds from right now (for testing short expiry)
  --lifetime, -l    Issue a Lifetime License with no expiration
  --trial [days]    Issue a Trial License (default: 14 days, e.g. --trial 7 or --trial --days 30)
  --out, -o         Custom destination path for .lic file

Examples:
  npm run license:generate -- --machine "BS-8F2A-99B1-4CD0-E7A3" --client "Grand Multiplex" --days 365
  npm run license:generate -- --machine "*" --client "Test Cinema" --minutes 2
  npm run license:generate -- --machine "BS-8F2A-99B1-4CD0-E7A3" --client "Apex Theaters" --lifetime
  npm run license:generate -- --machine "BS-8F2A-99B1-4CD0-E7A3" --client "Beta Cinema" --trial 7
  npm run license:generate -- --machine "BS-8F2A-99B1-4CD0-E7A3" --client "Beta Cinema" --trial --days 30
`);
}

const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  printUsage();
  process.exit(0);
}

function getArg(flag, shortFlag) {
  const idx = args.findIndex((a) => a === flag || a === shortFlag);
  if (idx !== -1 && idx + 1 < args.length) {
    return args[idx + 1];
  }
  return null;
}

function hasFlag(flag, shortFlag) {
  return args.includes(flag) || (shortFlag && args.includes(shortFlag));
}

const machineId = getArg('--machine', '-m');
const clientName = getArg('--client', '-c');
const licensee = getArg('--licensee', '-u') || '';
const isLifetime = hasFlag('--lifetime', '-l');
const isTrial = hasFlag('--trial');
const daysStr = getArg('--days', '-d');
const minutesStr = getArg('--minutes');
const secondsStr = getArg('--seconds');
const customOutPath = getArg('--out', '-o');

function getTrialDays() {
  const trialIdx = args.findIndex((a) => a === '--trial');
  if (trialIdx !== -1 && trialIdx + 1 < args.length) {
    const nextVal = args[trialIdx + 1];
    if (/^\d+$/.test(nextVal)) {
      return parseInt(nextVal, 10);
    }
  }
  if (daysStr && /^\d+$/.test(daysStr)) {
    return parseInt(daysStr, 10);
  }
  return 14;
}

if (!machineId || !clientName) {
  console.error('\nERROR: Missing required arguments (--machine and --client).\n');
  printUsage();
  process.exit(1);
}

if (!fs.existsSync(privateKeyPath)) {
  console.error(`\nERROR: Developer private key not found at ${privateKeyPath}.`);
  console.error('Run: node scripts/generate-keys.js to initialize your developer keypair first.\n');
  process.exit(1);
}

const privateKeyPem = fs.readFileSync(privateKeyPath, 'utf8');

const now = new Date();
let licenseType = 'subscription';
let expiresAt = null;

if (isLifetime) {
  licenseType = 'lifetime';
  expiresAt = null;
} else if (secondsStr && /^\d+$/.test(secondsStr)) {
  licenseType = 'subscription';
  const sec = parseInt(secondsStr, 10);
  expiresAt = new Date(now.getTime() + sec * 1000).toISOString();
} else if (minutesStr && /^\d+$/.test(minutesStr)) {
  licenseType = 'subscription';
  const mins = parseInt(minutesStr, 10);
  expiresAt = new Date(now.getTime() + mins * 60 * 1000).toISOString();
} else if (isTrial) {
  licenseType = 'trial';
  const trialDays = getTrialDays();
  const exp = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
  exp.setHours(23, 59, 59, 999);
  expiresAt = exp.toISOString();
} else {
  const days = daysStr ? parseInt(daysStr, 10) : 365;
  const exp = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  exp.setHours(23, 59, 59, 999);
  expiresAt = exp.toISOString();
}

const payload = {
  version: 1,
  product: 'Booking System Desktop Suite',
  licenseType,
  machineId: machineId.trim().toUpperCase(),
  clientName: clientName.trim(),
  licensee: licensee.trim(),
  issuedAt: now.toISOString(),
  expiresAt,
};

// Canonical payload string for signature verification
const canonicalString = JSON.stringify(payload, Object.keys(payload).sort());

// ECDSA P-256 SHA-256 digital signature
const signer = crypto.createSign('SHA256');
signer.update(canonicalString);
signer.end();
const signature = signer.sign(privateKeyPem, 'base64');

const licenseDocument = {
  payload,
  signature,
};

const licenseJson = JSON.stringify(licenseDocument, null, 2);
const licenseBase64Key = Buffer.from(licenseJson).toString('base64');

// Save .lic file
const safeName = clientName.replace(/[^a-zA-Z0-9_-]/g, '_');
const outFileName = customOutPath || path.join(rootDir, `${safeName}_Software_License.lic`);
fs.writeFileSync(outFileName, licenseJson, 'utf8');

console.log('\n======================================================');
console.log('   SOFTWARE LICENSE GENERATED SUCCESSFULLY');
console.log('======================================================');
console.log(`Product:       ${payload.product}`);
console.log(`Client:        ${payload.clientName}`);
if (payload.licensee) console.log(`Contact:       ${payload.licensee}`);
console.log(`License Type:  ${payload.licenseType.toUpperCase()}`);
console.log(`Machine ID:    ${payload.machineId}`);
console.log(`Issued Date:   ${payload.issuedAt.slice(0, 10)}`);
console.log(`Expires:       ${payload.expiresAt ? payload.expiresAt.slice(0, 10) : 'LIFETIME (Never)'}`);
console.log('------------------------------------------------------');
console.log(`File Saved:    ${outFileName}`);
console.log('------------------------------------------------------');
console.log('\nACTIVATION KEY STRING (Send this or the .lic file):');
console.log(licenseBase64Key);
console.log('\n======================================================\n');
