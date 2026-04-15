/**
 * Expandable info panel that explains what each of the six stats does.
 * Drop into any step where the player benefits from understanding
 * stat meanings — currently Race and Stats steps.
 *
 * Uses the native <details> element so it's keyboard-accessible and
 * doesn't need its own open/closed state management.
 */

interface StatInfo {
  key: string;
  name: string;
  abbr: string;
  increases: string[];
}

const STAT_INFO: StatInfo[] = [
  {
    key: 'str',
    name: 'Strength',
    abbr: 'STR',
    increases: ['Melee damage', 'Carry weight', 'Brute force in the world'],
  },
  {
    key: 'dex',
    name: 'Dexterity',
    abbr: 'DEX',
    increases: ['Ranged damage', 'Stealth and evasion', 'First to act in a fight'],
  },
  {
    key: 'con',
    name: 'Constitution',
    abbr: 'CON',
    increases: ['Hit points', 'Poison resistance', 'Endurance under hardship'],
  },
  {
    key: 'int',
    name: 'Intelligence',
    abbr: 'INT',
    increases: ['Arcane spell power', 'Lore and old languages', 'Precise crafting'],
  },
  {
    key: 'wis',
    name: 'Wisdom',
    abbr: 'WIS',
    increases: ['Divine spell power', 'Perception', 'Willpower against influence'],
  },
  {
    key: 'cha',
    name: 'Charisma',
    abbr: 'CHA',
    increases: ['Persuasion in dialogue', 'Better prices from merchants', 'Force of presence'],
  },
];

export function StatLegend() {
  return (
    <details className="cc__stats-help">
      <summary className="cc__stats-help-summary">
        <span className="cc__stats-help-icon" aria-hidden="true">i</span>
        <span>What do these stats mean?</span>
      </summary>
      <div className="cc__stats-help-grid">
        {STAT_INFO.map((s) => (
          <div key={s.key} className="cc__stats-help-card">
            <h4>
              {s.name}
              <span className="cc__stats-help-abbr">{s.abbr}</span>
            </h4>
            <p className="cc__stats-help-sub">Increases</p>
            <ul>
              {s.increases.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </details>
  );
}
