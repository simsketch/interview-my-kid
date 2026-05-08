import type { CategoryId } from '../categories';

const banks: Record<CategoryId, string[]> = {
  pre_game: [
    'What position are you playing today?',
    'How are you feeling about this game?',
    'What is one thing you want to work on out there?',
    'Who are you most excited to play with today?',
    'What would a great game look like for you?',
    'How do you calm down when you feel nervous?',
    'What did Coach say in practice this week that stuck with you?',
    'What is your warm-up routine?',
    'If today goes really well, what does that look like?',
    'What part of your game do you feel best about right now?',
    'What part of the other team are you watching out for?',
    'What is one small thing you want to remember when you step on the field?',
  ],
  post_game: [
    'What was your favorite moment from today?',
    'Tell me about a play you want to remember.',
    'What is one thing you did out there that you are proud of?',
    'What was the hardest part of today?',
    'If you could replay one moment, which would it be and why?',
    'What is one thing you learned about yourself today?',
    'How did the team feel out there together?',
    'Did anything surprise you about how the game went?',
    'What did Coach say to you after the game?',
    'How do your legs and arms feel right now?',
    'What do you want to work on before the next game?',
    'Was there a teammate who did something that stood out to you?',
    'What is something you tried today that you have never tried before?',
  ],
  moment: [
    'What was going through your head right then?',
    'What did that feel like?',
    'Did you see it coming, or did it surprise you?',
    'What were you trying to do on that play?',
    'What did you tell yourself in that moment?',
    'Walk me through what you saw out there.',
    'What happens the next time you get that same pitch or play?',
    'What did your teammates do right after?',
    'What do you want to remember about that moment?',
    'If that play could go a little differently, what would you change?',
    'What was the hardest part of that play?',
  ],
  season: [
    'What is your favorite memory from this season so far?',
    'Who on the team makes you laugh the most?',
    'What is something you can do now that you could not do at the start of the season?',
    'What is the biggest thing you have learned this season?',
    'Who on this team has helped you the most, and how?',
    'What is a goal you have for the rest of the season?',
    'If you could pick any game from this year to play again, which one and why?',
    'What has been the hardest part of the season for you?',
    'What do you love most about playing baseball?',
    'Where do you want to be by the end of the season?',
    'What is the funniest thing that has happened all year?',
    'What does this team feel like compared to teams you played on before?',
  ],
};

function shuffleAndTake<T>(arr: T[], n: number): T[] {
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, Math.min(n, copy.length));
}

export function pickFallbackQuestions(
  category: CategoryId,
  count: number
): string[] {
  const bank = banks[category] ?? [];
  return shuffleAndTake(bank, count);
}
