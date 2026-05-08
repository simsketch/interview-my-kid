import { type CategoryId } from '../categories';
import { DEFAULT_MODEL, getApiKey, getKidName, getModel } from '../storage/keychain';
import {
  buildSystemPrompt,
  buildUserPrompt,
  GenerationError,
  parseQuestionsFromText,
} from './prompts';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export class MissingApiKeyError extends Error {
  constructor() {
    super('Missing OpenRouter API key. Add it in Settings.');
    this.name = 'MissingApiKeyError';
  }
}

type ChatResponse = {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
};

export async function generateViaOpenRouter(opts: {
  category: CategoryId;
  context: string | null;
  count: number;
  signal?: AbortSignal;
}): Promise<string[]> {
  const apiKey = await getApiKey();
  if (!apiKey) throw new MissingApiKeyError();
  const model = await getModel();
  const kidName = await getKidName();

  const body = {
    model: model || DEFAULT_MODEL,
    messages: [
      { role: 'system', content: buildSystemPrompt({ category: opts.category, kidName }) },
      { role: 'user', content: buildUserPrompt(opts.context, opts.count) },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.85,
    max_tokens: 700,
  };

  let res: Response;
  try {
    res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/simsketch/interview-my-kid',
        'X-Title': 'Interview My Kid',
      },
      body: JSON.stringify(body),
      signal: opts.signal,
    });
  } catch (err) {
    throw new GenerationError(
      err instanceof Error ? `Network error: ${err.message}` : 'Network error.'
    );
  }

  if (!res.ok) {
    let detail = '';
    try {
      const errBody = (await res.json()) as ChatResponse;
      detail = errBody.error?.message ?? '';
    } catch {
      // ignore
    }
    throw new GenerationError(
      `OpenRouter error ${res.status}${detail ? `: ${detail}` : ''}`
    );
  }

  const data = (await res.json()) as ChatResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new GenerationError('Model returned empty response.');
  return parseQuestionsFromText(content);
}
