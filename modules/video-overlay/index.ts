import { requireOptionalNativeModule } from 'expo-modules-core';

export type BurnInCue = {
  text: string;
  startMs: number;
  endMs: number;
};

export type BurnInPosition = 'top' | 'middle' | 'bottom';

type VideoOverlayNative = {
  burnIn: (
    sourceUri: string,
    destinationUri: string,
    cues: BurnInCue[],
    position: BurnInPosition
  ) => Promise<string>;
};

const native = requireOptionalNativeModule<VideoOverlayNative>('VideoOverlay');

export function isVideoOverlayAvailable(): boolean {
  return native !== null;
}

export async function burnIn(opts: {
  sourceUri: string;
  destinationUri: string;
  cues: BurnInCue[];
  position: BurnInPosition;
}): Promise<string> {
  if (!native) {
    throw new Error('VideoOverlay native module not linked');
  }
  return native.burnIn(opts.sourceUri, opts.destinationUri, opts.cues, opts.position);
}
