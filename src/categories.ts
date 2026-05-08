export type CategoryId = 'pre_game' | 'post_game' | 'moment' | 'season';

export type Category = {
  id: CategoryId;
  label: string;
  blurb: string;
  systemHint: string;
};

export const categories: Category[] = [
  {
    id: 'pre_game',
    label: 'Pre-game',
    blurb: 'Mood, expectations, what he is working on today.',
    systemHint:
      'Questions for BEFORE the game. Focus on mindset, expectations, the matchup, what he is working on, who he is excited to play. Keep them anticipatory and energizing.',
  },
  {
    id: 'post_game',
    label: 'Post-game',
    blurb: 'Highlights, what went well, what to work on next.',
    systemHint:
      'Questions for AFTER the game. Mix highlights, growth moments, and feelings. Encourage reflection without being critical. Cover at-bats, fielding, teammates, and the moment he wants to remember.',
  },
  {
    id: 'moment',
    label: 'Specific moment',
    blurb: 'Right after a hit, error, or big play.',
    systemHint:
      'Questions for IN-THE-MOMENT, right after a specific play. Tight, present-tense, focused on the play. Capture his immediate emotion and what was going through his head.',
  },
  {
    id: 'season',
    label: 'Season / big picture',
    blurb: 'Goals, favorite teammates, what he is learning long-term.',
    systemHint:
      'Questions for SEASON-LEVEL reflection. Big picture: goals, growth, teammates, favorite memories of the season, dreams for next year. Slower pace, more thoughtful.',
  },
];

export function categoryById(id: CategoryId): Category {
  const found = categories.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown category: ${id}`);
  return found;
}
