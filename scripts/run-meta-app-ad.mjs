// Create a Meta APP INSTALL ad via the Marketing API.
//
// The sibling script (run-meta-ad.mjs) builds an OUTCOME_TRAFFIC campaign that
// sends people to the docs landing page. This one uses OUTCOME_APP_PROMOTION so
// Meta optimizes for actual App Store installs and reports them back.
//
// It reuses the video + thumbnail already uploaded for the traffic ad rather
// than re-uploading, so the creative is identical apart from the CTA.
//
// Usage:
//   node scripts/run-meta-app-ad.mjs              # create everything PAUSED
//   node scripts/run-meta-app-ad.mjs --activate   # create and turn on
//
// Env (loaded from .env.meta.local):
//   META_ACCESS_TOKEN, META_AD_ACCOUNT_ID, META_PAGE_ID, META_APP_ID
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const API = 'https://graph.facebook.com/v20.0';

const DEFAULTS = {
  campaignName: 'IMK · App Installs · Launch',
  adSetName: 'IMK · US Parents 25-45 · iOS',
  adName: 'IMK · Video 4x5 · install v1',
  dailyBudgetCents: 500,
  countries: ['US'],
  ageMin: 25,
  ageMax: 45,

  // Reused from the traffic creative (already uploaded + processed).
  videoId: '1671322077314748',
  imageHash: 'b128d1866386f8a9fd7434a0635cf5f8',

  iosStoreId: '6767672476',
  storeUrl: 'https://apps.apple.com/app/id6767672476',

  primaryText:
    'Turn everyday moments with your kid into treasured memories. Interview My Kid asks the questions — you just hit record.',
  headline: "The interview questions you'll wish you asked",
};

function loadDotenv(p) {
  const env = {};
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return env;
}

async function graph(method, path, { token, json } = {}) {
  const url = new URL(`${API}${path}`);
  const init = { method };
  if (json) {
    init.headers = { 'Content-Type': 'application/json' };
    init.body = JSON.stringify({ ...json, access_token: token });
  } else if (method === 'GET' && token) {
    url.searchParams.set('access_token', token);
  }
  const res = await fetch(url, init);
  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    /* ignore */
  }
  if (!res.ok || data?.error) {
    const err = new Error(`Meta API ${method} ${path} failed (${res.status})`);
    err.body = data ?? text;
    throw err;
  }
  return data;
}

async function main() {
  const activate = process.argv.includes('--activate');
  const env = loadDotenv(join(root, '.env.meta.local'));
  const token = env.META_ACCESS_TOKEN;
  const accountId = env.META_AD_ACCOUNT_ID;
  const pageId = env.META_PAGE_ID;
  const appId = env.META_APP_ID;
  for (const [k, v] of Object.entries({ token, accountId, pageId, appId })) {
    if (!v) {
      console.error(`Missing ${k} in .env.meta.local`);
      process.exit(1);
    }
  }

  const status = activate ? 'ACTIVE' : 'PAUSED';

  console.log(`▸ Creating campaign (${status})…`);
  const campaign = await graph('POST', `/act_${accountId}/campaigns`, {
    token,
    json: {
      name: DEFAULTS.campaignName,
      objective: 'OUTCOME_APP_PROMOTION',
      status,
      special_ad_categories: [],
      is_adset_budget_sharing_enabled: false,
    },
  });
  console.log(`  campaign_id = ${campaign.id}`);

  console.log(`▸ Creating ad set ($${DEFAULTS.dailyBudgetCents / 100}/day, iOS, APP_INSTALLS)…`);
  const adset = await graph('POST', `/act_${accountId}/adsets`, {
    token,
    json: {
      name: DEFAULTS.adSetName,
      campaign_id: campaign.id,
      status,
      daily_budget: DEFAULTS.dailyBudgetCents,
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'APP_INSTALLS',
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      // This is the piece the old hand-built campaign was missing — without
      // application_id Meta rejects the ad set with error #1815437.
      promoted_object: {
        application_id: appId,
        object_store_url: DEFAULTS.storeUrl,
      },
      targeting: {
        age_min: DEFAULTS.ageMin,
        age_max: DEFAULTS.ageMax,
        geo_locations: { countries: DEFAULTS.countries },
        publisher_platforms: ['facebook', 'instagram'],
        facebook_positions: ['feed', 'facebook_reels'],
        instagram_positions: ['stream', 'explore', 'reels'],
        device_platforms: ['mobile'],
        user_os: ['iOS'],
        targeting_automation: { advantage_audience: 0 },
      },
    },
  });
  console.log(`  adset_id = ${adset.id}`);

  console.log(`▸ Creating ad creative (INSTALL_MOBILE_APP)…`);
  const creative = await graph('POST', `/act_${accountId}/adcreatives`, {
    token,
    json: {
      name: `${DEFAULTS.adName} · creative`,
      object_story_spec: {
        page_id: pageId,
        video_data: {
          video_id: DEFAULTS.videoId,
          image_hash: DEFAULTS.imageHash,
          message: DEFAULTS.primaryText,
          title: DEFAULTS.headline,
          call_to_action: {
            type: 'INSTALL_MOBILE_APP',
            value: {
              link: DEFAULTS.storeUrl,
              application: appId,
            },
          },
        },
      },
    },
  });
  console.log(`  creative_id = ${creative.id}`);

  console.log(`▸ Creating ad (${status})…`);
  const ad = await graph('POST', `/act_${accountId}/ads`, {
    token,
    json: {
      name: DEFAULTS.adName,
      adset_id: adset.id,
      status,
      creative: { creative_id: creative.id },
    },
  });
  console.log(`  ad_id = ${ad.id}`);

  console.log('');
  console.log(`✓ App install ad created — ${status}`);
  console.log(`  Campaign: ${campaign.id}`);
  console.log(`  Ad Set:   ${adset.id}`);
  console.log(`  Creative: ${creative.id}`);
  console.log(`  Ad:       ${ad.id}`);
  console.log(
    `  Ads Manager: https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${accountId}&selected_campaign_ids=${campaign.id}`
  );
}

main().catch((err) => {
  console.error('✗', err.message);
  if (err.body) console.error(JSON.stringify(err.body, null, 2));
  process.exit(1);
});
