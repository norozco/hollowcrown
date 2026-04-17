import { DiceRoller } from './dice';
import { ALL_RACES, getRace, type RaceKey } from './race';
import { ALL_CLASSES, getClass, type ClassKey } from './classes';
import {
  STAT_KEYS,
  ZERO_STATS,
  type StatBlock,
  type StatKey,
} from './stats';
import type { CharacterInit } from './character';

/**
 * Pool of Souls-flavored placeholder names for the Random Hero button.
 * Keep entries short (≤15 chars), alphabetic-start, and neutral enough
 * to fit any race. Duplicates are fine — RNG just biases toward them.
 */
const NAME_POOL = [
  'Aldric',
  'Braen',
  'Caelwyn',
  'Dariel',
  'Elyn',
  'Fane',
  'Gaelen',
  'Hale',
  'Isra',
  'Jorrin',
  'Kael',
  'Lith',
  'Maren',
  'Nera',
  'Oren',
  'Pael',
  'Quen',
  'Riven',
  'Saela',
  'Torren',
  'Una',
  'Veyl',
  'Wren',
  'Yara',
  'Zael',
  'Morrow',
  'Ashen',
  'Thorne',
  'Vaelin',
  'Nyx',
];

/**
 * Roll a complete, playable CharacterInit at random. Stats get
 * sensible-if-random assignment: higher rolled values land on the
 * chosen class's primary stats, so a random Wizard usually has
 * decent INT rather than having it dumped on CHA.
 *
 * Difficulty defaults to Normal — Hardcore should always be a
 * conscious choice, never surprised on a quick-start.
 */
export function rollRandomCharacter(): CharacterInit {
  const dice = new DiceRoller();

  const name = pick(NAME_POOL);
  const raceKey = pick(ALL_RACES).key as RaceKey;
  const classKey = pick(ALL_CLASSES).key as ClassKey;

  // Six 4d6-drop-lowest values, sorted high-to-low.
  const rolled = dice.rollStatBlock().sort((a, b) => b - a);

  // Assign the best rolls to the class's primary stats, then fill the
  // rest in canonical STR/DEX/CON/INT/WIS/CHA order.
  const klass = getClass(classKey);
  const primary = new Set<StatKey>(klass.primaryStats);
  const orderedStats: StatKey[] = [
    ...klass.primaryStats,
    ...STAT_KEYS.filter((s) => !primary.has(s)),
  ];
  const rolledStats: StatBlock = { ...ZERO_STATS };
  orderedStats.forEach((stat, i) => {
    rolledStats[stat] = rolled[i];
  });

  // Race-specific player choices (Half-Elf extra bonuses, Dragonborn element).
  const race = getRace(raceKey);

  let extraBonuses: Partial<StatBlock> | undefined;
  if (race.playerChoiceBonuses) {
    const excluded = new Set<StatKey>(
      (race.playerChoiceBonuses.excludeStats ?? []) as StatKey[],
    );
    const eligible = STAT_KEYS.filter((s) => !excluded.has(s));
    const shuffled = shuffle(eligible);
    const picks = shuffled.slice(0, race.playerChoiceBonuses.count);
    extraBonuses = Object.fromEntries(
      picks.map((s) => [s, race.playerChoiceBonuses!.amount]),
    ) as Partial<StatBlock>;
  }

  let playerChoice: string | undefined;
  if (race.playerChoiceOption) {
    playerChoice = pick(race.playerChoiceOption.options as readonly string[]);
  }

  return {
    name,
    raceKey,
    classKey,
    rolledStats,
    difficulty: 'normal',
    gender: Math.random() > 0.5 ? 'female' : 'male',
    extraBonuses,
    playerChoice,
  };
}

function pick<T>(arr: readonly T[]): T {
  if (arr.length === 0) throw new Error('pick: empty array');
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
