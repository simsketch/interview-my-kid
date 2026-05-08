import { requireOptionalNativeModule } from 'expo-modules-core';

type FoundationModelsNative = {
  isAvailable: () => Promise<boolean>;
  unavailableReason: () => Promise<string | null>;
  generate: (instructions: string, prompt: string) => Promise<string>;
};

const native = requireOptionalNativeModule<FoundationModelsNative>('FoundationModels');

export async function isAvailable(): Promise<boolean> {
  if (!native) return false;
  try {
    return await native.isAvailable();
  } catch {
    return false;
  }
}

export async function unavailableReason(): Promise<string | null> {
  if (!native) return 'FoundationModels native module not linked';
  try {
    return await native.unavailableReason();
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

export async function generate(
  instructions: string,
  prompt: string
): Promise<string> {
  if (!native) {
    throw new Error('FoundationModels native module not linked');
  }
  return native.generate(instructions, prompt);
}
