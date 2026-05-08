import type { CategoryId } from '../categories';
import { getApiKey, getProvider, type ProviderPreference } from '../storage/keychain';
import { pickFallbackQuestions } from './fallback';
import {
  foundationUnavailableReason,
  generateViaFoundation,
  isFoundationAvailable,
} from './foundation';
import { generateViaOpenRouter } from './openrouter';

export type Provider = 'on_device' | 'cloud' | 'static';

export type GenerateResult = {
  questions: string[];
  provider: Provider;
  notice?: string;
};

const DEFAULT_COUNT = 7;

export async function generateQuestions(opts: {
  category: CategoryId;
  context: string | null;
  count?: number;
}): Promise<GenerateResult> {
  const count = opts.count ?? DEFAULT_COUNT;
  const preference = await getProvider();
  const chain = await orderChain(preference);
  const failures: string[] = [];

  for (const provider of chain) {
    try {
      if (provider === 'on_device') {
        const ok = await isFoundationAvailable();
        if (!ok) {
          const reason = await foundationUnavailableReason();
          failures.push(`on-device: ${reason ?? 'unavailable'}`);
          continue;
        }
        const questions = await generateViaFoundation({
          category: opts.category,
          context: opts.context,
          count,
        });
        return {
          questions,
          provider: 'on_device',
          notice: failures.length > 0 ? `Used on-device after: ${failures.join('; ')}` : undefined,
        };
      }
      if (provider === 'cloud') {
        const key = await getApiKey();
        if (!key) {
          failures.push('no OpenRouter key');
          continue;
        }
        const questions = await generateViaOpenRouter({
          category: opts.category,
          context: opts.context,
          count,
        });
        return {
          questions,
          provider: 'cloud',
          notice: failures.length > 0 ? `Used cloud after: ${failures.join('; ')}` : undefined,
        };
      }
      if (provider === 'static') {
        const questions = pickFallbackQuestions(opts.category, count);
        return {
          questions,
          provider: 'static',
          notice:
            failures.length > 0
              ? `Used built-in questions (${failures.join('; ')})`
              : undefined,
        };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      failures.push(`${provider}: ${msg}`);
    }
  }

  // Last-resort: always return static rather than fail.
  return {
    questions: pickFallbackQuestions(opts.category, count),
    provider: 'static',
    notice:
      failures.length > 0
        ? `Used built-in questions (${failures.join('; ')})`
        : undefined,
  };
}

async function orderChain(pref: ProviderPreference): Promise<Provider[]> {
  switch (pref) {
    case 'on_device':
      return ['on_device', 'static'];
    case 'cloud':
      return ['cloud', 'static'];
    case 'static':
      return ['static'];
    case 'auto':
    default:
      return ['on_device', 'cloud', 'static'];
  }
}
