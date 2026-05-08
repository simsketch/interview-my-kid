import { categoryById, type CategoryId } from '../categories';

export class GenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GenerationError';
  }
}

export function buildSystemPrompt(opts: {
  category: CategoryId;
  kidName: string | null;
}): string {
  const cat = categoryById(opts.category);
  const subject = opts.kidName ?? 'the child';
  return [
    `You are helping a parent interview their kid (${subject}) about baseball on video.`,
    `The parent will read each question aloud as a cue card. Questions should be short, warm, and age-appropriate.`,
    ``,
    `Category: ${cat.label}`,
    cat.systemHint,
    ``,
    `Rules:`,
    `- Each question must be one sentence, under ~18 words.`,
    `- Open-ended where possible (avoid yes/no).`,
    `- Mix of factual ("what happened"), emotional ("how did it feel"), and reflective ("what would you do again").`,
    `- Avoid leading questions and avoid asking the kid to evaluate teammates negatively.`,
    `- Address ${subject} directly using "you" — do not use third person.`,
    `- Use natural spoken language a parent would actually say.`,
    ``,
    `Return EXACTLY this JSON shape, no prose, no markdown fences:`,
    `{"questions": ["...", "...", "..."]}`,
  ].join('\n');
}

export function buildUserPrompt(context: string | null, count: number): string {
  const lines = [`Generate ${count} cue card questions.`];
  if (context && context.trim().length > 0) {
    lines.push('');
    lines.push('Context the parent provided about today:');
    lines.push(context.trim());
  }
  return lines.join('\n');
}

function extractJsonObject(content: string): unknown {
  const trimmed = content.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through to bracket extraction
  }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const candidate = trimmed.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch {
      // ignore
    }
  }
  throw new GenerationError('Could not parse model output as JSON.');
}

function coerceQuestionsFromObject(parsed: unknown): string[] {
  if (
    parsed &&
    typeof parsed === 'object' &&
    'questions' in parsed &&
    Array.isArray((parsed as { questions: unknown }).questions)
  ) {
    const arr = (parsed as { questions: unknown[] }).questions;
    const cleaned = arr
      .filter((q): q is string => typeof q === 'string')
      .map((q) => q.trim())
      .filter((q) => q.length > 0);
    if (cleaned.length > 0) return cleaned;
  }
  throw new GenerationError('Model output did not contain a non-empty "questions" array.');
}

export function parseQuestionsFromText(content: string): string[] {
  return coerceQuestionsFromObject(extractJsonObject(content));
}
