// Create (or find) a TestFlight tester group and invite an external tester.
// Usage:
//   node scripts/add-tester.mjs                     # defaults: group=Family, email=$FASTLANE_APPLE_ID
//   node scripts/add-tester.mjs --group Family --email someone@example.com --first Sam --last Kid

import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const APP_BUNDLE_ID = 'com.simsketch.interviewmykid';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1];
      out[key] = val;
      i++;
    }
  }
  return out;
}

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
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    env[key] = value;
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

async function asc(token, path, options = {}) {
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
  const r = await asc(token, `/v1/apps?filter[bundleId]=${encodeURIComponent(bundleId)}`);
  if (r.status !== 200) throw new Error(`GET /apps failed ${r.status}: ${JSON.stringify(r.body)}`);
  return r.body.data?.[0] ?? null;
}

async function findBetaGroup(token, appId, name) {
  const r = await asc(token, `/v1/apps/${appId}/betaGroups?limit=200`);
  if (r.status !== 200) throw new Error(`GET betaGroups failed ${r.status}: ${JSON.stringify(r.body)}`);
  return r.body.data?.find((g) => g.attributes.name === name) ?? null;
}

async function createBetaGroup(token, appId, name) {
  const r = await asc(token, `/v1/betaGroups`, {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'betaGroups',
        attributes: { name, publicLinkEnabled: false },
        relationships: {
          app: { data: { type: 'apps', id: appId } },
        },
      },
    }),
  });
  if (r.status !== 201) throw new Error(`POST betaGroups failed ${r.status}: ${JSON.stringify(r.body)}`);
  return r.body.data;
}

async function findBetaTester(token, email) {
  const r = await asc(token, `/v1/betaTesters?filter[email]=${encodeURIComponent(email)}&limit=1`);
  if (r.status !== 200) throw new Error(`GET betaTesters failed ${r.status}: ${JSON.stringify(r.body)}`);
  return r.body.data?.[0] ?? null;
}

async function createBetaTester(token, email, firstName, lastName, betaGroupId) {
  const r = await asc(token, `/v1/betaTesters`, {
    method: 'POST',
    body: JSON.stringify({
      data: {
        type: 'betaTesters',
        attributes: { email, firstName, lastName },
        relationships: {
          betaGroups: { data: [{ type: 'betaGroups', id: betaGroupId }] },
        },
      },
    }),
  });
  if (r.status !== 201) throw new Error(`POST betaTesters failed ${r.status}: ${JSON.stringify(r.body)}`);
  return r.body.data;
}

async function addTesterToGroup(token, testerId, groupId) {
  const r = await asc(token, `/v1/betaGroups/${groupId}/relationships/betaTesters`, {
    method: 'POST',
    body: JSON.stringify({
      data: [{ type: 'betaTesters', id: testerId }],
    }),
  });
  if (r.status !== 204) throw new Error(`POST add to group failed ${r.status}: ${JSON.stringify(r.body)}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = loadDotenv(join(root, 'fastlane', '.env'));
  const groupName = args.group || 'Family';
  const email = args.email || env.FASTLANE_APPLE_ID;
  const firstName = args.first || 'Family';
  const lastName = args.last || 'Tester';
  if (!email) throw new Error('email required (--email someone@example.com)');

  const privateKeyPem = readFileSync(env.ASC_KEY_FILEPATH, 'utf8');
  const token = makeJwt({
    keyId: env.ASC_KEY_ID,
    issuerId: env.ASC_ISSUER_ID,
    privateKeyPem,
  });

  console.log(`→ Looking up app ${APP_BUNDLE_ID}…`);
  const app = await findApp(token, APP_BUNDLE_ID);
  if (!app) throw new Error('App not found.');
  console.log(`  found: id=${app.id}`);

  console.log(`→ Looking up TestFlight beta group "${groupName}"…`);
  let group = await findBetaGroup(token, app.id, groupName);
  if (!group) {
    console.log('  not found — creating…');
    group = await createBetaGroup(token, app.id, groupName);
    console.log(`  created: id=${group.id}`);
  } else {
    console.log(`  found: id=${group.id}`);
  }

  console.log(`→ Looking up beta tester ${email}…`);
  const existing = await findBetaTester(token, email);
  if (existing) {
    console.log(`  exists: id=${existing.id} — adding to group…`);
    try {
      await addTesterToGroup(token, existing.id, group.id);
      console.log('  ✓ added');
    } catch (err) {
      if (/already.*member|409/i.test(err.message)) {
        console.log('  (already a member of this group)');
      } else {
        throw err;
      }
    }
  } else {
    console.log('  not found — creating + inviting…');
    const tester = await createBetaTester(token, email, firstName, lastName, group.id);
    console.log(`  created: id=${tester.id}`);
  }

  console.log(`\n✅ ${email} is now in TestFlight group "${groupName}".`);
  console.log("   They'll get an email invite (or see the build under 'External Builds' in TestFlight).");
  console.log("   First-time external builds need a one-time Beta App Review (~24h);");
  console.log("   internal testers (anyone on your dev team) see the build immediately.");
}

main().catch((err) => {
  console.error('✗ Failed:', err.message);
  process.exit(1);
});
