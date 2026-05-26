// Push App Store metadata text (description, keywords, promo, support URLs)
// directly via the ASC API, bypassing fastlane's known review_attachment_file
// fetch bug for brand-new apps.
//
// Usage: node scripts/push-asc-text.mjs

import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

const APP_BUNDLE_ID = 'com.simsketch.interviewmykid';
const LOCALE = 'en-US';

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

function readMetadata(name) {
  return readFileSync(join(root, 'fastlane', 'metadata', LOCALE, `${name}.txt`), 'utf8').trim();
}

function readSupportUrl() {
  return readMetadata('support_url');
}

async function findApp(token, bundleId) {
  const { status, body } = await asc(token, `/v1/apps?filter[bundleId]=${encodeURIComponent(bundleId)}`);
  if (status !== 200) throw new Error(`GET /apps failed ${status}: ${JSON.stringify(body)}`);
  return body.data?.[0] ?? null;
}

async function findVersion(token, appId) {
  const { status, body } = await asc(
    token,
    `/v1/apps/${appId}/appStoreVersions?filter[platform]=IOS&limit=5`
  );
  if (status !== 200) throw new Error(`GET /appStoreVersions failed ${status}: ${JSON.stringify(body)}`);
  // Most recent first.
  return body.data?.[0] ?? null;
}

async function findVersionLocalization(token, versionId, locale) {
  const { status, body } = await asc(
    token,
    `/v1/appStoreVersions/${versionId}/appStoreVersionLocalizations`
  );
  if (status !== 200)
    throw new Error(`GET appStoreVersionLocalizations failed ${status}: ${JSON.stringify(body)}`);
  return body.data?.find((d) => d.attributes.locale === locale) ?? null;
}

async function patchVersionLocalization(token, locId, attributes) {
  const { status, body } = await asc(token, `/v1/appStoreVersionLocalizations/${locId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      data: { id: locId, type: 'appStoreVersionLocalizations', attributes },
    }),
  });
  if (status !== 200)
    throw new Error(`PATCH appStoreVersionLocalizations failed ${status}: ${JSON.stringify(body)}`);
  return body.data;
}

async function findAppInfoLocalization(token, appId, locale) {
  // App-level localization (name, subtitle, privacy URL)
  const { status, body } = await asc(token, `/v1/apps/${appId}/appInfos?limit=1`);
  if (status !== 200) throw new Error(`GET appInfos failed ${status}: ${JSON.stringify(body)}`);
  const appInfoId = body.data?.[0]?.id;
  if (!appInfoId) return null;
  const locs = await asc(token, `/v1/appInfos/${appInfoId}/appInfoLocalizations`);
  if (locs.status !== 200)
    throw new Error(`GET appInfoLocalizations failed ${locs.status}: ${JSON.stringify(locs.body)}`);
  return locs.body.data?.find((d) => d.attributes.locale === locale) ?? null;
}

async function patchAppInfoLocalization(token, locId, attributes) {
  const { status, body } = await asc(token, `/v1/appInfoLocalizations/${locId}`, {
    method: 'PATCH',
    body: JSON.stringify({ data: { id: locId, type: 'appInfoLocalizations', attributes } }),
  });
  if (status !== 200)
    throw new Error(`PATCH appInfoLocalizations failed ${status}: ${JSON.stringify(body)}`);
  return body.data;
}

async function main() {
  const env = loadDotenv(join(root, 'fastlane', '.env'));
  const privateKeyPem = readFileSync(env.ASC_KEY_FILEPATH, 'utf8');
  const token = makeJwt({
    keyId: env.ASC_KEY_ID,
    issuerId: env.ASC_ISSUER_ID,
    privateKeyPem,
  });

  console.log(`→ Looking up app ${APP_BUNDLE_ID}…`);
  const app = await findApp(token, APP_BUNDLE_ID);
  if (!app) throw new Error('App not found in App Store Connect.');
  console.log(`  found: id=${app.id}, name="${app.attributes.name}"`);

  console.log(`→ Looking up latest App Store version…`);
  const version = await findVersion(token, app.id);
  if (!version) throw new Error('No App Store version found.');
  console.log(
    `  found: id=${version.id}, version=${version.attributes.versionString}, state=${version.attributes.appStoreState}`
  );

  console.log(`→ Looking up version localization for ${LOCALE}…`);
  const versionLoc = await findVersionLocalization(token, version.id, LOCALE);
  if (!versionLoc) throw new Error(`No ${LOCALE} version localization. Add one in ASC.`);
  console.log(`  found: id=${versionLoc.id}`);

  // Push version-level fields: description, keywords, promotional_text, support/marketing URLs, release notes.
  const description = readMetadata('description');
  const keywords = readMetadata('keywords');
  const promotionalText = readMetadata('promotional_text');
  const supportUrl = readSupportUrl();
  const marketingUrl = readMetadata('marketing_url');
  const whatsNew = readMetadata('release_notes');

  console.log(`→ Pushing version localization (description, keywords, promo, URLs)…`);
  // whatsNew is locked on the first version submission — skip it on initial release.
  const attrs = {
    description,
    keywords,
    promotionalText,
    supportUrl,
    marketingUrl,
  };
  try {
    await patchVersionLocalization(token, versionLoc.id, { ...attrs, whatsNew });
    console.log('  ✓ updated (with what\'s new)');
  } catch (err) {
    if (/whatsNew.*cannot be edited/i.test(err.message)) {
      // First version — drop whatsNew and retry.
      await patchVersionLocalization(token, versionLoc.id, attrs);
      console.log('  ✓ updated (whatsNew skipped — first version)');
    } else {
      throw err;
    }
  }

  // Push app-level fields: privacy URL.
  const privacyUrl = readMetadata('privacy_url');
  console.log(`→ Pushing app info localization (privacy URL)…`);
  const appInfoLoc = await findAppInfoLocalization(token, app.id, LOCALE);
  if (appInfoLoc) {
    await patchAppInfoLocalization(token, appInfoLoc.id, {
      privacyPolicyUrl: privacyUrl,
    });
    console.log('  ✓ updated');
  } else {
    console.log(`  (no ${LOCALE} app info localization found; skipped)`);
  }

  console.log('\n✅ Metadata text pushed.');
  console.log('   Remaining manual steps in App Store Connect web UI:');
  console.log('   • App Privacy → Get Started → answer No to all data collection');
  console.log('   • App Information → Age Rating → all None → 4+');
  console.log('   • Then click Submit for Review.');
}

main().catch((err) => {
  console.error('✗ Failed:', err.message);
  process.exit(1);
});
