export type CategoryId =
  | 'pre_game'
  | 'post_game'
  | 'moment'
  | 'season'
  | 'before_school'
  | 'after_school'
  | 'end_of_day'
  | 'big_feeling'
  | 'milestone'
  | 'trip'
  | 'open';

export type CategoryGroup = 'sports' | 'school' | 'daily' | 'occasion' | 'open';

export type Category = {
  id: CategoryId;
  group: CategoryGroup;
  label: string;
  blurb: string;
  /** Hint passed to the AI to shape the question style. Should describe WHEN
   * and the tone, not assume any particular subject domain (sport, school,
   * etc.) unless the category is itself domain-specific. */
  systemHint: string;
};

export const categoryGroups: { id: CategoryGroup; label: string }[] = [
  { id: 'sports', label: 'Sports & Performance' },
  { id: 'school', label: 'School' },
  { id: 'daily', label: 'Daily Life' },
  { id: 'occasion', label: 'Special Moments' },
  { id: 'open', label: 'Open' },
];

export const categories: Category[] = [
  // Sports & performance
  {
    id: 'pre_game',
    group: 'sports',
    label: 'Pre-game',
    blurb: 'Before a game or competition. Mood, expectations, what they\'re working on.',
    systemHint:
      'Questions for BEFORE a sports game, performance, or competition. Focus on mindset, expectations, the matchup, what they are working on, who they are excited to play or perform with. Keep them anticipatory and energizing.',
  },
  {
    id: 'post_game',
    group: 'sports',
    label: 'Post-game',
    blurb: 'After a game or competition. Highlights, what went well, what to improve.',
    systemHint:
      'Questions for AFTER a sports game, performance, or competition. Mix highlights, growth moments, and feelings. Encourage reflection without being critical. Cover at-bats, plays, teammates, and the moment they want to remember.',
  },
  {
    id: 'moment',
    group: 'sports',
    label: 'Right after a play',
    blurb: 'In-the-moment, right after a specific play, hit, or big moment.',
    systemHint:
      'Questions for IN-THE-MOMENT, right after a specific play or game moment. Tight, present-tense, focused on what just happened. Capture their immediate emotion and what was going through their head.',
  },
  {
    id: 'season',
    group: 'sports',
    label: 'Season recap',
    blurb: 'Big-picture reflection on a season or stretch of competition.',
    systemHint:
      'Questions for SEASON-LEVEL reflection on a sports or activity season. Big picture: goals, growth, teammates, favorite memories, dreams for next year. Slower pace, more thoughtful.',
  },
  // School
  {
    id: 'before_school',
    group: 'school',
    label: 'Before school',
    blurb: 'Set the day up. What you\'re looking forward to, what you\'re dreading.',
    systemHint:
      'Questions for BEFORE A SCHOOL DAY. Focus on what they are looking forward to, what they are dreading, what they want to try, who they want to see, what they are bringing in their backpack besides books. Light, curious tone — not a interrogation.',
  },
  {
    id: 'after_school',
    group: 'school',
    label: 'After school',
    blurb: 'Recap the school day. What stood out, what was hard, what was funny.',
    systemHint:
      'Questions for AFTER A SCHOOL DAY. Focus on what happened in classes, who they spent time with, what they learned, what was fun or hard, and the small specific moments that made the day. Avoid prying. Mix factual ("what did you eat at lunch") with reflective ("when did you feel most yourself today").',
  },
  // Daily life
  {
    id: 'end_of_day',
    group: 'daily',
    label: 'End of day check-in',
    blurb: 'Wind-down questions. Highs, lows, gratitude.',
    systemHint:
      'Questions for END-OF-DAY reflection — bedtime-ish vibe. Cover high/low, something they noticed today, something they\'re looking forward to tomorrow, something they\'re grateful for. Calm, warm tone.',
  },
  // Special moments
  {
    id: 'big_feeling',
    group: 'occasion',
    label: 'Big feeling',
    blurb: 'After a strong emotion — pride, worry, joy, frustration.',
    systemHint:
      'Questions for AFTER A BIG EMOTIONAL MOMENT — joy, pride, worry, anger, fear, sadness, excitement. Help them name the feeling, locate it in the body, identify what brought it on, and decide what to do with it. Empathetic and curious, not analytical.',
  },
  {
    id: 'milestone',
    group: 'occasion',
    label: 'Milestone',
    blurb: 'Birthday, achievement, first or last time, transition.',
    systemHint:
      'Questions for a MILESTONE moment — a birthday, an achievement, a first time, a last time, or a transition. Mix factual (what happened, who was there) with reflective (what does this mean to you, what comes next). Celebratory but unhurried.',
  },
  {
    id: 'trip',
    group: 'occasion',
    label: 'After a trip',
    blurb: 'Coming home from a vacation, visit, or special outing.',
    systemHint:
      'Questions for AFTER A TRIP, vacation, or special outing. Cover the highlight, the surprise, who they spent time with, what was different about being away, and what they\'re bringing home with them mentally.',
  },
  // Open / free-form
  {
    id: 'open',
    group: 'open',
    label: 'Free-form',
    blurb: 'Open-ended interview shaped entirely by your context note.',
    systemHint:
      'Open-ended questions, framed by whatever context the parent provides. If no context is given, ask broad get-to-know-you questions a parent might ask their kid: favorites, dreams, things they want to be remembered for, what they wonder about. Warm, curious, unhurried.',
  },
];

export function categoryById(id: CategoryId): Category {
  const found = categories.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown category: ${id}`);
  return found;
}
