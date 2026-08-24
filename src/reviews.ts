import * as StoreReview from 'expo-store-review';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getReviewRequested, setReviewRequested } from './storage/keychain';

/**
 * Asks for an App Store rating after the user has finished a few interviews.
 *
 * The app shipped with zero ratings, which is close to fatal for a paid app:
 * nobody pays for an unrated app they met in an ad. This is the cheapest way
 * to fix that, but only if the ask lands at the right moment.
 *
 * Third completed session, not the first. After one interview the parent has
 * a video; after three they have something that feels like a habit, and
 * that's the difference between "sure" and "not yet". We only get one shot —
 * Apple caps the system dialog at three appearances per year across the whole
 * install and never tells us how many remain — so we spend it once and record
 * that we did.
 *
 * Every failure path here is a no-op. A missing rating is worth nothing next
 * to interrupting the moment a parent just recorded their kid.
 */

const SESSIONS_BEFORE_ASKING = 3;

export async function maybeRequestReview(db: SQLiteDatabase): Promise<void> {
  try {
    if (await getReviewRequested()) return;

    const row = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) AS count FROM sessions'
    );
    if ((row?.count ?? 0) < SESSIONS_BEFORE_ASKING) return;

    // isAvailableAsync covers the simulator and any build where StoreKit is
    // absent; hasAction covers a device that can't route to a store page.
    if (!(await StoreReview.isAvailableAsync())) return;
    if (!(await StoreReview.hasAction())) return;

    // Mark before requesting. If the request throws after the system dialog
    // has already appeared, a retry would burn another of Apple's three
    // yearly slots for nothing.
    await setReviewRequested();
    await StoreReview.requestReview();
  } catch {
    // Never let a rating prompt break the save flow.
  }
}
