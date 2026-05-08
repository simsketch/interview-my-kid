// Creates the App Store Connect app entry for Interview My Kid via the ASC API
// (using a JWT signed with the user's existing .p8 key).
// Idempotent: skips creation if the app already exists.
//
// Usage: node scripts/create-asc-app.mjs
//
// Reads ASC_KEY_FILEPATH, ASC_KEY_ID, ASC_ISSUER_ID from fastlane/.env.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSign } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const APP_BUNDLE_ID = 'com.simsketch.interviewmykid';
const APP_NAME = 'Interview My Kid';
const APP_SKU = 'interview-my-kid';
const APP_PRIMARY_LOCALE = 'en-US';

function loadDotenv(path) {
  const text = readFileSync(path, 'utf8');
  const env = {};
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function base64Url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function makeJwt({ keyId, issuerId, privateKeyPem }) {
  const header = { alg: 'ES256', kid: keyId, typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: issuerId,
    iat: now,
    exp: now + 1200,
    aud: 'appstoreconnect-v1',
  };
  const headerB64 = base64Url(JSON.stringify(header));
  const payloadB64 = base64Url(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;
  const sign = createSign('SHA256');
  sign.update(signingInput);
  sign.end();
  // ES256 produces an ASN.1 DER signature; ASC expects raw R||S concatenation.
  const derSig = sign.sign({ key: privateKeyPem, dsaEncoding: 'ieee-p1363' });
  return `${signingInput}.${base64Url(derSig)}`;
}

async function ascFetch(token, path, options = {}) {
  const res = await fetch(`https://api.appstoreconnect.apple.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body };
}

async function findApp(token, bundleId) {
  const { status, body } = await ascFetch(
    token,
    `/v1/apps?filter[bundleId]=${encodeURIComponent(bundleId)}`
  );
  if (status !== 200) {
    throw new Error(
      `ASC GET /apps failed ${status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`
    );
  }
  return body.data?.[0] ?? null;
}

async function findBundleId(token, identifier) {
  const { status, body } = await ascFetch(
    token,
    `/v1/bundleIds?filter[identifier]=${encodeURIComponent(identifier)}`
  );
  if (status !== 200) {
    throw new Error(
      `ASC GET /bundleIds failed ${status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`
    );
  }
  return body.data?.[0] ?? null;
}

async function createBundleId(token, identifier, name) {
  const { status, body } = await ascFetch(token, '/v1/bundleIds', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'bundleIds',
        attributes: {
          identifier,
          name,
          platform: 'IOS',
        },
      },
    }),
  });
  if (status !== 201) {
    throw new Error(
      `ASC POST /bundleIds failed ${status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`
    );
  }
  return body.data;
}

async function createApp(token, bundleIdRecord) {
  const { status, body } = await ascFetch(token, '/v1/apps', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'apps',
        attributes: {
          bundleId: APP_BUNDLE_ID,
          name: APP_NAME,
          primaryLocale: APP_PRIMARY_LOCALE,
          sku: APP_SKU,
        },
        relationships: {
          bundleId: {
            data: { type: 'bundleIds', id: bundleIdRecord.id },
          },
        },
      },
    }),
  });
  if (status !== 201) {
    throw new Error(
      `ASC POST /apps failed ${status}: ${typeof body === 'string' ? body : JSON.stringify(body)}`
    );
  }
  return body.data;
}

async function main() {
  const env = loadDotenv(join(root, 'fastlane', '.env'));
  const keyPath = env.ASC_KEY_FILEPATH;
  const keyId = env.ASC_KEY_ID;
  const issuerId = env.ASC_ISSUER_ID;
  if (!keyPath || !keyId || !issuerId) {
    throw new Error('Missing ASC_KEY_FILEPATH / ASC_KEY_ID / ASC_ISSUER_ID in fastlane/.env');
  }
  const privateKeyPem = readFileSync(keyPath, 'utf8');
  const token = makeJwt({ keyId, issuerId, privateKeyPem });

  console.log(`→ Looking up bundle ID ${APP_BUNDLE_ID}…`);
  let bundleIdRecord = await findBundleId(token, APP_BUNDLE_ID);
  if (!bundleIdRecord) {
    console.log('  not found — creating it.');
    bundleIdRecord = await createBundleId(token, APP_BUNDLE_ID, APP_NAME.replace(/\s+/g, ''));
    console.log(`  created (id=${bundleIdRecord.id})`);
  } else {
    console.log(`  found (id=${bundleIdRecord.id})`);
  }

  console.log(`→ Looking up ASC app for ${APP_BUNDLE_ID}…`);
  const existing = await findApp(token, APP_BUNDLE_ID);
  if (existing) {
    console.log(
      `✓ ASC app already exists: id=${existing.id}, name="${existing.attributes.name}"`
    );
    return;
  }

  console.log('→ Creating App Store Connect app entry…');
  try {
    const app = await createApp(token, bundleIdRecord);
    console.log(
      `✓ Created: id=${app.id}, name="${app.attributes.name}", sku="${app.attributes.sku}"`
    );
  } catch (err) {
    if (/does not allow .CREATE/i.test(err.message)) {
      console.log('');
      console.log('⚠️  Apple does not allow creating App Store apps via the API.');
      console.log('   This is a one-time manual step. Open this URL:');
      console.log('');
      console.log('     https://appstoreconnect.apple.com/apps');
      console.log('');
      console.log('   Click the blue + button → New App, then fill in:');
      console.log('');
      console.log(`     Platform:         iOS`);
      console.log(`     Name:             ${APP_NAME}`);
      console.log(`     Primary Language: English (U.S.)`);
      console.log(`     Bundle ID:        ${APP_BUNDLE_ID} (auto-listed; the bundle was just created)`);
      console.log(`     SKU:              ${APP_SKU}`);
      console.log(`     User Access:      Full Access`);
      console.log('');
      console.log('   Click Create. Then re-run this script to verify.');
      process.exit(2);
    }
    throw err;
  }
}

main().catch((err) => {
  console.error('✗ Failed:', err.message);
  process.exit(1);
});
