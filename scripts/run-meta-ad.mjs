// Create a Meta ad end-to-end via the Marketing API.
//
// Uploads a video, waits for processing, then creates campaign → ad set →
// creative → ad. Everything starts PAUSED so you can eyeball it in Ads Manager
// before flipping to ACTIVE.
//
// Usage:
//   node scripts/run-meta-ad.mjs
//   node scripts/run-meta-ad.mjs --activate   # flip everything to ACTIVE after creating
//   node scripts/run-meta-ad.mjs --video remotion/out/interview-my-kid-ad-4x5.mp4
//
// Env (loaded from .env.meta.local):
//   META_ACCESS_TOKEN, META_AD_ACCOUNT_ID, META_PAGE_ID
import { readFileSync } from 'node:fs';
import { openAsBlob } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const API = 'https://graph.facebook.com/v20.0';

const DEFAULTS = {
  videoRelPath: 'remotion/out/interview-my-kid-ad-4x5.mp4',
  thumbnailRelPath: 'remotion/out/feed150.png',
  campaignName: 'IMK · Traffic · Launch',
  adSetName: 'IMK · US Parents 25-45',
  adName: 'IMK · Video 4x5 · v1',
  dailyBudgetCents: 500,
  countries: ['US'],
  ageMin: 25,
  ageMax: 45,
  primaryText:
    'Turn everyday moments with your kid into treasured memories. Interview My Kid asks the questions — you just hit record.',
  headline: "The interview questions you'll wish you asked",
  // Landing page (not the App Store URL directly — Meta rejects those on
  // OUTCOME_TRAFFIC). The page carries the App Store CTA with a ct= token.
  linkUrl: 'https://simsketch.github.io/interview-my-kid/',
  cta: 'LEARN_MORE',
};

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
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  }
  return env;
}

function parseArgs(argv) {
  const out = { activate: false, videoPath: null, adsetId: null, creativeId: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--activate') out.activate = true;
    else if (argv[i] === '--video' && argv[i + 1]) {
      out.videoPath = argv[i + 1];
      i++;
    } else if (argv[i] === '--adset-id' && argv[i + 1]) {
      out.adsetId = argv[i + 1];
      i++;
    } else if (argv[i] === '--creative-id' && argv[i + 1]) {
      out.creativeId = argv[i + 1];
      i++;
    }
  }
  return out;
}

async function graph(method, path, { token, form, json } = {}) {
  const url = new URL(`${API}${path}`);
  const init = { method };
  if (form) {
    form.append('access_token', token);
    init.body = form;
  } else if (json) {
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

async function uploadVideo(token, accountId, videoPath) {
  const blob = await openAsBlob(videoPath);
  const form = new FormData();
  form.append('source', blob, basename(videoPath));
  const data = await graph('POST', `/act_${accountId}/advideos`, { token, form });
  return data.id;
}

async function uploadAdImage(token, accountId, imagePath) {
  const blob = await openAsBlob(imagePath);
  const form = new FormData();
  form.append('filename', blob, basename(imagePath));
  const data = await graph('POST', `/act_${accountId}/adimages`, { token, form });
  const imgs = data.images ?? {};
  const first = Object.values(imgs)[0];
  if (!first?.hash) throw new Error(`No image hash returned: ${JSON.stringify(data)}`);
  return first.hash;
}

async function waitForVideoReady(token, videoId, { timeoutMs = 300_000, intervalMs = 5_000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const data = await graph('GET', `/${videoId}?fields=status`, { token });
    const state = data.status?.video_status;
    if (state === 'ready') return;
    if (state === 'error') {
      const err = new Error(`Video processing failed: ${JSON.stringify(data.status)}`);
      err.body = data;
      throw err;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Video processing timeout after ${timeoutMs}ms`);
}

async function createCampaign(token, accountId, { name, activate }) {
  return graph('POST', `/act_${accountId}/campaigns`, {
    token,
    json: {
      name,
      objective: 'OUTCOME_TRAFFIC',
      status: activate ? 'ACTIVE' : 'PAUSED',
      special_ad_categories: [],
      is_adset_budget_sharing_enabled: false,
    },
  });
}

async function createAdSet(token, accountId, opts) {
  const {
    campaignId,
    name,
    dailyBudgetCents,
    countries,
    ageMin,
    ageMax,
    activate,
  } = opts;
  return graph('POST', `/act_${accountId}/adsets`, {
    token,
    json: {
      name,
      campaign_id: campaignId,
      status: activate ? 'ACTIVE' : 'PAUSED',
      daily_budget: dailyBudgetCents,
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'LINK_CLICKS',
      bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
      destination_type: 'WEBSITE',
      targeting: {
        age_min: ageMin,
        age_max: ageMax,
        geo_locations: { countries },
        publisher_platforms: ['facebook', 'instagram'],
        // Stories omitted on purpose: in the Jul–Aug 2026 run it soaked up 91% of
        // spend at the worst CPC ($0.58) while feed/reels came in at $0.27–0.39.
        facebook_positions: ['feed', 'facebook_reels'],
        instagram_positions: ['stream', 'explore', 'reels'],
        device_platforms: ['mobile'],
        user_os: ['iOS'],
        targeting_automation: { advantage_audience: 0 },
      },
    },
  });
}

async function createCreative(token, accountId, opts) {
  const { name, pageId, videoId, imageHash, primaryText, headline, linkUrl, cta } = opts;
  return graph('POST', `/act_${accountId}/adcreatives`, {
    token,
    json: {
      name,
      object_story_spec: {
        page_id: pageId,
        video_data: {
          video_id: videoId,
          image_hash: imageHash,
          message: primaryText,
          title: headline,
          link_description: '',
          call_to_action: {
            type: cta,
            value: { link: linkUrl },
          },
        },
      },
    },
  });
}

async function createAd(token, accountId, opts) {
  const { name, adsetId, creativeId, activate } = opts;
  return graph('POST', `/act_${accountId}/ads`, {
    token,
    json: {
      name,
      adset_id: adsetId,
      status: activate ? 'ACTIVE' : 'PAUSED',
      creative: { creative_id: creativeId },
    },
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const env = loadDotenv(join(root, '.env.meta.local'));
  const token = env.META_ACCESS_TOKEN;
  const accountId = env.META_AD_ACCOUNT_ID;
  const pageId = env.META_PAGE_ID;
  if (!token || !accountId || !pageId) {
    console.error('Missing META_ACCESS_TOKEN, META_AD_ACCOUNT_ID, or META_PAGE_ID in .env.meta.local');
    process.exit(1);
  }

  const status = args.activate ? 'ACTIVE' : 'PAUSED';

  let adsetId = args.adsetId;
  let creativeId = args.creativeId;
  let campaignId = null;
  let videoId = null;

  if (!adsetId || !creativeId) {
    const videoPath = resolve(root, args.videoPath ?? DEFAULTS.videoRelPath);
    const thumbnailPath = resolve(root, DEFAULTS.thumbnailRelPath);

    console.log(`▸ Uploading thumbnail: ${thumbnailPath}`);
    const imageHash = await uploadAdImage(token, accountId, thumbnailPath);
    console.log(`  image_hash = ${imageHash}`);

    console.log(`▸ Uploading video: ${videoPath}`);
    videoId = await uploadVideo(token, accountId, videoPath);
    console.log(`  video_id = ${videoId}`);

    console.log(`▸ Waiting for video processing…`);
    await waitForVideoReady(token, videoId);
    console.log(`  video ready`);

    console.log(`▸ Creating campaign (${status})…`);
    const campaign = await createCampaign(token, accountId, {
      name: DEFAULTS.campaignName,
      activate: args.activate,
    });
    campaignId = campaign.id;
    console.log(`  campaign_id = ${campaignId}`);

    console.log(`▸ Creating ad set ($${DEFAULTS.dailyBudgetCents / 100}/day, iOS mobile, ${DEFAULTS.countries.join(',')})…`);
    const adset = await createAdSet(token, accountId, {
      campaignId,
      name: DEFAULTS.adSetName,
      dailyBudgetCents: DEFAULTS.dailyBudgetCents,
      countries: DEFAULTS.countries,
      ageMin: DEFAULTS.ageMin,
      ageMax: DEFAULTS.ageMax,
      activate: args.activate,
    });
    adsetId = adset.id;
    console.log(`  adset_id = ${adsetId}`);

    console.log(`▸ Creating ad creative…`);
    const creative = await createCreative(token, accountId, {
      name: `${DEFAULTS.adName} · creative`,
      pageId,
      videoId,
      imageHash,
      primaryText: DEFAULTS.primaryText,
      headline: DEFAULTS.headline,
      linkUrl: DEFAULTS.linkUrl,
      cta: DEFAULTS.cta,
    });
    creativeId = creative.id;
    console.log(`  creative_id = ${creativeId}`);
  } else {
    console.log(`▸ Resuming with existing adset_id=${adsetId} creative_id=${creativeId}`);
  }

  console.log(`▸ Creating ad (${status})…`);
  const ad = await createAd(token, accountId, {
    name: DEFAULTS.adName,
    adsetId,
    creativeId,
    activate: args.activate,
  });
  console.log(`  ad_id = ${ad.id}`);

  console.log('');
  console.log(`✓ Ad created — ${status}`);
  console.log(`  Ads Manager: https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${accountId}${campaignId ? `&selected_campaign_ids=${campaignId}` : ''}`);
  if (campaignId) console.log(`  Campaign: ${campaignId}`);
  console.log(`  Ad Set:   ${adsetId}`);
  console.log(`  Creative: ${creativeId}`);
  console.log(`  Ad:       ${ad.id}`);
  if (videoId) console.log(`  Video:    ${videoId}`);
  if (!args.activate) {
    console.log('');
    console.log('  To activate: run with --activate, or flip statuses to ACTIVE in Ads Manager.');
  }
}

main().catch((err) => {
  console.error('✗', err.message);
  if (err.body) console.error(JSON.stringify(err.body, null, 2));
  process.exit(1);
});
