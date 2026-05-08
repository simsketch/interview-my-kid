import { type CategoryId } from '../categories';
import { getKidName } from '../storage/keychain';
import {
  generate as fmGenerate,
  isAvailable as fmIsAvailable,
  unavailableReason as fmUnavailableReason,
} from '../../modules/foundation-models';
import {
  buildSystemPrompt,
  buildUserPrompt,
  GenerationError,
  parseQuestionsFromText,
} from './prompts';

export async function isFoundationAvailable(): Promise<boolean> {
  return fmIsAvailable();
}

export async function foundationUnavailableReason(): Promise<string | null> {
  return fmUnavailableReason();
}

export async function generateViaFoundation(opts: {
  category: CategoryId;
  context: string | null;
  count: number;
}): Promise<string[]> {
  const kidName = await getKidName();
  const system = buildSystemPrompt({ category: opts.category, kidName });
  const user = buildUserPrompt(opts.context, opts.count);
  let raw: string;
  try {
    raw = await fmGenerate(system, user);
  } catch (err) {
    throw new GenerationError(
      err instanceof Error ? err.message : String(err)
    );
  }
  return parseQuestionsFromText(raw);
}
