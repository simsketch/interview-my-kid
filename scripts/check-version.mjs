// Check the current App Store version and which build it's attached to.
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

const b64u = (b) => Buffer.from(b).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

function makeJwt({ keyId, issuerId, privateKeyPem }) {
  const header = { alg: 'ES256', kid: keyId, typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { iss: issuerId, iat: now, exp: now + 1200, aud: 'appstoreconnect-v1' };
  const h = b64u(JSON.stringify(header));
  const p = b64u(JSON.stringify(payload));
  const s = createSign('SHA256');
  s.update(`${h}.${p}`);
  s.end();
  return `${h}.${p}.${b64u(s.sign({ key: privateKeyPem, dsaEncoding: 'ieee-p1363' }))}`;
}

async function asc(token, path) {
  const res = await fetch(`https://api.appstoreconnect.apple.com${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  return { status: res.status, body: await res.json() };
}

async function main() {
  const env = loadDotenv(join(root, 'fastlane', '.env'));
  const pem = readFileSync(env.ASC_KEY_FILEPATH, 'utf8');
  const token = makeJwt({ keyId: env.ASC_KEY_ID, issuerId: env.ASC_ISSUER_ID, privateKeyPem: pem });

  const apps = await asc(token, `/v1/apps?filter[bundleId]=${encodeURIComponent(APP_BUNDLE_ID)}`);
  const app = apps.body.data?.[0];
  if (!app) throw new Error('App not found');

  const versions = await asc(token, `/v1/apps/${app.id}/appStoreVersions?include=build&limit=5`);
  console.log(`App Store versions for ${app.attributes.name}:\n`);
  for (const v of versions.body.data ?? []) {
    const a = v.attributes;
    const buildId = v.relationships?.build?.data?.id ?? null;
    let buildVer = '-';
    if (buildId) {
      const inc = versions.body.included?.find((i) => i.id === buildId);
      buildVer = inc?.attributes?.version ?? '-';
    }
    console.log(
      `  version=${a.versionString}  state=${a.appStoreState}  releaseType=${a.releaseType}  createdDate=${a.createdDate}  attachedBuild=${buildVer}`
    );
  }

  // Check submission status
  const subs = await asc(token, `/v1/apps/${app.id}/reviewSubmissions?limit=5`);
  console.log(`\nReview submissions:\n`);
  for (const s of subs.body.data ?? []) {
    console.log(
      `  id=${s.id}  state=${s.attributes.state}  submittedDate=${s.attributes.submittedDate ?? '-'}`
    );
  }
}

main().catch((e) => {
  console.error('✗', e.message);
  process.exit(1);
});
