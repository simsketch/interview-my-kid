import type { CategoryId } from '../categories';
import type { CardSet } from '../db/cardSets';

type DefaultSet = {
  id: string;
  name: string;
  category: CategoryId;
  prompts: string[];
};

const DEFAULT_SETS: DefaultSet[] = [
  // Pre-game
  {
    id: 'default:pre_game:check_in',
    name: 'Game-day check-in',
    category: 'pre_game',
    prompts: [
      'How are you feeling about this game?',
      'What is one thing you want to work on out there?',
      'How are your nerves on a scale of one to ten?',
      'What would a great game look like for you?',
      'What is one thing you want me to notice about you today?',
    ],
  },
  {
    id: 'default:pre_game:mindset',
    name: 'Mindset deep dive',
    category: 'pre_game',
    prompts: [
      'How do you calm down when you feel nervous?',
      'What part of your game do you feel best about right now?',
      'What is one fear you want to leave in the parking lot?',
      'What is one strength you want to bring out today?',
      'What did Coach say in practice this week that stuck with you?',
      'Tell me about one teammate you are counting on.',
      'What is one mistake you are okay with making today?',
    ],
  },
  // Post-game
  {
    id: 'default:post_game:quick_recap',
    name: 'Quick recap',
    category: 'post_game',
    prompts: [
      'What was your favorite moment from today?',
      'What is one thing you did out there that you are proud of?',
      'What was the hardest part of today?',
      'How would you grade your own effort today?',
      'What do you want to work on before the next game?',
    ],
  },
  {
    id: 'default:post_game:reflection',
    name: 'Reflection',
    category: 'post_game',
    prompts: [
      'Tell me about a play you want to remember.',
      'What is one thing you learned about yourself today?',
      'Was there a moment you almost gave up — and what kept you going?',
      'What was going through your head during the biggest moment?',
      'Was there a teammate who did something that stood out to you?',
      'What is the one thing you want to remember from this game in ten years?',
      'What is your number-one lesson from today?',
    ],
  },
  // Moment
  {
    id: 'default:moment:right_now',
    name: 'In the moment',
    category: 'moment',
    prompts: [
      'What was going through your head right then?',
      'What did that feel like?',
      'What were you trying to do on that play?',
      'How is your heart feeling right now?',
      'What do you want to remember about that moment?',
    ],
  },
  {
    id: 'default:moment:replay_it',
    name: 'Replay it',
    category: 'moment',
    prompts: [
      'Walk me through what you saw out there.',
      'Did you see it coming, or did it surprise you?',
      'What was the muscle memory that kicked in?',
      'How did time feel — fast or slow?',
      'What does this moment teach you?',
    ],
  },
  // Season
  {
    id: 'default:season:highlights',
    name: 'Season highlights',
    category: 'season',
    prompts: [
      'What is your favorite memory from this season so far?',
      'What is something you can do now that you could not do at the start of the season?',
      'Who on the team makes you laugh the most?',
      'What is the funniest thing that has happened all year?',
      'How would you describe this season in three words?',
      'What is the best feeling you have had on the field this year?',
    ],
  },
  {
    id: 'default:season:back_and_ahead',
    name: 'Looking back, looking ahead',
    category: 'season',
    prompts: [
      'What is the biggest thing you have learned this season?',
      'Who on this team has helped you the most, and how?',
      'What has been the hardest part of the season for you?',
      'What is the biggest moment of growth you have noticed in yourself?',
      'What is one thing you want to do differently next season?',
      'What would you tell yourself at the start of the season if you could go back?',
      'What do you want next year\'s version of this team to know?',
    ],
  },
  // Before school
  {
    id: 'default:before_school:morning_check',
    name: 'Morning check-in',
    category: 'before_school',
    prompts: [
      'How is your brain feeling — sleepy, sharp, fuzzy?',
      'What is one thing you are looking forward to today?',
      'What is one thing you are dreading?',
      'Is there a test, presentation, or project today?',
      'What is a small win that would make today feel good?',
    ],
  },
  {
    id: 'default:before_school:on_your_mind',
    name: "What's on your mind",
    category: 'before_school',
    prompts: [
      'What is something you are nervous about?',
      'What is something you are confident about?',
      'Is there a friend you want to make plans with after school?',
      'Is there a worry you want to leave at the door?',
      'What is something kind you could do for a classmate today?',
      'What is one promise you want to make to yourself for today?',
      'If today went perfectly, what would happen?',
    ],
  },
  // After school
  {
    id: 'default:after_school:how_was_today',
    name: 'How was today',
    category: 'after_school',
    prompts: [
      'What was the best part of your day?',
      'What is one thing that happened today that surprised you?',
      'Was there a moment today when you laughed out loud?',
      'Was there anything that was harder than you expected?',
      'What is one thing you want to try tomorrow?',
    ],
  },
  {
    id: 'default:after_school:tell_me_more',
    name: 'Tell me about it',
    category: 'after_school',
    prompts: [
      'Who did you spend time with at lunch?',
      'Who was kind to you today, and how?',
      'Were you kind to anyone today?',
      'What did you learn that you want to remember?',
      'What is the funniest thing a friend said to you today?',
      'Was there a moment when you felt totally yourself today?',
      'Was there a moment when you felt out of place?',
    ],
  },
  // End of day
  {
    id: 'default:end_of_day:wind_down',
    name: 'Bedtime wind-down',
    category: 'end_of_day',
    prompts: [
      'What was the best part of your day?',
      'Was there a hard part of the day you want to talk about?',
      'What is something you are looking forward to tomorrow?',
      'How is your body feeling right now?',
      'What is the last good thing that happened today?',
    ],
  },
  {
    id: 'default:end_of_day:gratitude',
    name: 'Gratitude check',
    category: 'end_of_day',
    prompts: [
      'What is something you are grateful for tonight?',
      'Who do you want to thank for something today?',
      'What is one thing you are proud of from today?',
      'What was the kindest thing someone did for you?',
      'What is the one thing you want to remember from today?',
    ],
  },
  // Big feeling
  {
    id: 'default:big_feeling:name_it',
    name: 'Naming the feeling',
    category: 'big_feeling',
    prompts: [
      'Can you describe the feeling — what does it feel like in your body?',
      'When did you first start feeling this way?',
      'What do you think made the feeling start?',
      'Where in your body do you feel it most?',
      'Does the feeling have a name you would give it?',
    ],
  },
  {
    id: 'default:big_feeling:sit_together',
    name: 'Sit with it together',
    category: 'big_feeling',
    prompts: [
      'What helps when you feel this way?',
      'What is one tiny thing that might help right now?',
      'Is there something you want me to know but it is hard to say out loud?',
      'Would it help if we just sat together for a minute?',
      'What is the kindest thing you could say to yourself right now?',
      'What is one breath we can take together right now?',
    ],
  },
  // Milestone
  {
    id: 'default:milestone:this_day',
    name: 'This day',
    category: 'milestone',
    prompts: [
      'How does today feel different from any other day?',
      'What is something you want to remember from this exact moment?',
      'Who is someone you want to thank for helping you get here?',
      'What is one thing that has been a long time coming?',
      'What is the one moment from today that hit you in the chest?',
    ],
  },
  {
    id: 'default:milestone:then_now_next',
    name: 'Then, now, next',
    category: 'milestone',
    prompts: [
      'What is something you can do now that you could not before?',
      'What advice would you give to a younger version of you?',
      'What is the next thing you want to work toward?',
      'If you could send one message to your future self, what would it be?',
      'What do you want to be known for at this age?',
      'What is one promise you want to make to yourself?',
    ],
  },
  // Trip
  {
    id: 'default:trip:highlights',
    name: 'Trip highlights',
    category: 'trip',
    prompts: [
      'What was your favorite moment from the trip?',
      'What was something that surprised you?',
      'What was the funniest thing that happened?',
      'What was the most beautiful thing you saw?',
      'What did you eat that you want to have again?',
    ],
  },
  {
    id: 'default:trip:bring_home',
    name: "What you'll bring home",
    category: 'trip',
    prompts: [
      'What did you learn about yourself on this trip?',
      'What did you learn about the people you traveled with?',
      'What is something you want to bring home with you, even if it is just an idea?',
      'Was there a moment you wished you could stay forever — what was it?',
      'Where do you want to go next, and why?',
      'What is one tradition you want to bring back home?',
    ],
  },
  // Open
  {
    id: 'default:open:get_to_know_you',
    name: 'Get to know you',
    category: 'open',
    prompts: [
      'What is something nobody knows about you yet?',
      'What is something you are wondering about lately?',
      'What is the best thing about being your age right now?',
      'What is something you want to be known for?',
      'What is a question you wish someone would ask you?',
    ],
  },
  {
    id: 'default:open:bigger_questions',
    name: 'Bigger questions',
    category: 'open',
    prompts: [
      'Who is somebody you really admire, and why?',
      'What does love feel like to you?',
      'What does home feel like to you?',
      'What is the bravest thing you have ever done?',
      'What is one thing you have always wanted to ask me?',
      'What do you hope changes about the world by the time you grow up?',
      'What is something kids your age understand that grown-ups don\'t?',
    ],
  },
];

export type BuiltInCardSet = CardSet & { isBuiltIn: true };

export function getDefaultSetsByCategory(category: CategoryId): BuiltInCardSet[] {
  return DEFAULT_SETS.filter((s) => s.category === category).map((s) => ({
    id: s.id,
    name: s.name,
    category: s.category,
    prompts: s.prompts.slice(),
    createdAt: 0,
    updatedAt: 0,
    lastUsedAt: null,
    isBuiltIn: true,
  }));
}

export function isBuiltInSetId(id: string): boolean {
  return id.startsWith('default:');
}
