// Query App Store Connect for the latest TestFlight build and its processing
// state. Usage: node scripts/check-tf-build.mjs
import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const APP_BUNDLE_ID = 'com.simsketch.interviewmykid';

function loadDotenv(p) {
  const text = readFileSync(p, 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    env[k] = v;
  }
  return env;
}

function base64Url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function makeJwt({ keyId, issuerId, privateKeyPem }) {
  const header = { alg: 'ES256', kid: keyId, typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: issuerId, iat: now, exp: now + 1200, aud: 'appstoreconnect-v1' };
  const headerB64 = base64Url(JSON.stringify(header));
  const payloadB64 = base64Url(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;
  const sign = createSign('SHA256');
  sign.update(signingInput);
  sign.end();
  const derSig = sign.sign({ key: privateKeyPem, dsaEncoding: 'ieee-p1363' });
  return `${signingInput}.${base64Url(derSig)}`;
}

async function asc(token, path) {
  const res = await fetch(`https://api.appstoreconnect.apple.com${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  const body = await res.json();
  return { status: res.status, body };
}

async function main() {
  const env = loadDotenv(join(root, 'fastlane', '.env'));
  const privateKeyPem = readFileSync(env.ASC_KEY_FILEPATH, 'utf8');
  const token = makeJwt({ keyId: env.ASC_KEY_ID, issuerId: env.ASC_ISSUER_ID, privateKeyPem });

  const appRes = await asc(token, `/v1/apps?filter[bundleId]=${encodeURIComponent(APP_BUNDLE_ID)}`);
  const app = appRes.body.data?.[0];
  if (!app) throw new Error('App not found');

  const buildsRes = await asc(
    token,
    `/v1/builds?filter[app]=${app.id}&sort=-uploadedDate&limit=5&include=preReleaseVersion,buildBundles`
  );
  const builds = buildsRes.body.data ?? [];
  console.log(`App: ${app.attributes.name} (${app.attributes.bundleId})`);
  console.log(`Latest builds (newest first):\n`);
  for (const b of builds) {
    const a = b.attributes;
    console.log(
      `  build #${a.version}  state=${a.processingState}  expired=${a.expired}  uploaded=${a.uploadedDate}  validated=${a.validForBetaTesting ?? '-'}`
    );
  }
}

main().catch((err) => {
  console.error('✗', err.message);
  process.exit(1);
});
