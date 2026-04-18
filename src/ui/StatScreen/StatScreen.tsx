import { usePlayerStore, getHeartPieceHpBonus } from '../../state/playerStore';
import { useInventoryStore } from '../../state/inventoryStore';
import { useAchievementStore } from '../../state/achievementStore';
import { useQuestStore } from '../../state/questStore';
import { useDungeonItemStore } from '../../state/dungeonItemStore';
import { DUNGEON_ITEMS } from '../../engine/dungeonItems';
import { getPerkHpBonus, getPerkMpBonus, getPerkCombatBonuses, ALL_PERKS } from '../../engine/perks';
import { COMPANIONS, companionBonusLabel } from '../../engine/companion';
import { getCurrentRank } from '../../engine/ranks';
import { modifier, STAT_KEYS } from '../../engine/stats';
import './StatScreen.css';

interface Props { onClose: () => void; }

const STAT_LABELS: Record<string, string> = {
  str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', cha: 'CHA',
};

function formatMod(val: number): string {
  const m = modifier(val);
  return m >= 0 ? `+${m}` : `${m}`;
}

export function StatScreen({ onClose }: Props) {
  const character = usePlayerStore((s) => s.character);
  const perks = usePlayerStore((s) => s.perks);
  const companionKey = usePlayerStore((s) => s.companion);
  usePlayerStore((s) => s.version);
  const equipment = useInventoryStore((s) => s.equipment);
  const totalKills = useAchievementStore((s) => s.totalKills);
  const totalDeaths = useAchievementStore((s) => s.totalDeaths);
  const bossesKilled = useAchievementStore((s) => s.bossesKilled);
  const zonesVisited = useAchievementStore((s) => s.zonesVisited);
  const questActive = useQuestStore((s) => s.active);
  const heartPieces = usePlayerStore((s) => s.heartPieces);
  const dungeonItems = useDungeonItemStore((s) => s.found);

  if (!character) return null;

  const d = character.derived;
  const perkHp = getPerkHpBonus(perks);
  const perkMp = getPerkMpBonus(perks);
  const perkCombat = getPerkCombatBonuses(perks);
  const questsCompleted = Object.values(questActive).filter((q) => q.turnedIn).length;
  const rank = getCurrentRank(questsCompleted, character.level);

  // Equipment bonuses aggregate
  const equipBonuses = { ac: 0, attack: 0, damage: 0, hp: 0, mp: 0 };
  const equipSlots = Object.values(equipment);
  const equippedItems: string[] = [];
  for (const item of equipSlots) {
    if (!item) continue;
    equippedItems.push(item.name);
    if (item.statBonus) {
      if (item.statBonus.ac) equipBonuses.ac += item.statBonus.ac;
      if (item.statBonus.attack) equipBonuses.attack += item.statBonus.attack;
      if (item.statBonus.damage) equipBonuses.damage += item.statBonus.damage;
      if (item.statBonus.hp) equipBonuses.hp += item.statBonus.hp;
      if (item.statBonus.mp) equipBonuses.mp += item.statBonus.mp;
    }
  }

  const companion = companionKey ? COMPANIONS[companionKey] : null;

  // Resolve perk display names
  const perkNames = perks.map((pk) => {
    const def = ALL_PERKS.find((p) => p.key === pk);
    return def ? `${def.name} (${def.description})` : pk;
  });

  return (
    <div className="statscreen" role="dialog" aria-label="Character Stats">
      <div className="statscreen__header">
        <h2>Character Stats</h2>
        <button type="button" className="statscreen__close" onClick={onClose}>&#10005;</button>
      </div>
      <div className="statscreen__body">
        {/* LEFT COLUMN */}
        <div>
          {/* Base Stats */}
          <div className="statscreen__section">
            <h3 className="statscreen__section-title">BASE STATS</h3>
            {STAT_KEYS.map((key) => (
              <div key={key} className="statscreen__row">
                <span className="statscreen__row-label">{STAT_LABELS[key]}</span>
                <span className="statscreen__row-value">
                  {character.stats[key]} ({formatMod(character.stats[key])})
                </span>
              </div>
            ))}
          </div>

          {/* Derived Stats */}
          <div className="statscreen__section" style={{ marginTop: '0.75rem' }}>
            <h3 className="statscreen__section-title">DERIVED STATS</h3>
            <div className="statscreen__row statscreen__row--highlight">
              <span className="statscreen__row-label">AC</span>
              <span className="statscreen__row-value">{d.ac + equipBonuses.ac}</span>
            </div>
            <div className="statscreen__row statscreen__row--highlight">
              <span className="statscreen__row-label">Max HP</span>
              <span className="statscreen__row-value">{d.maxHp + perkHp + equipBonuses.hp + getHeartPieceHpBonus(heartPieces)}</span>
            </div>
            <div className="statscreen__row statscreen__row--highlight">
              <span className="statscreen__row-label">Max MP</span>
              <span className="statscreen__row-value">{d.maxMp + perkMp + equipBonuses.mp}</span>
            </div>
            <div className="statscreen__row">
              <span className="statscreen__row-label">Attack Bonus</span>
              <span className="statscreen__row-value">+{modifier(character.stats.str) + equipBonuses.attack + perkCombat.attack}</span>
            </div>
            <div className="statscreen__row">
              <span className="statscreen__row-label">Damage Bonus</span>
              <span className="statscreen__row-value">+{modifier(character.stats.str) + equipBonuses.damage + perkCombat.damage}</span>
            </div>
          </div>

          {/* Equipment Bonuses */}
          <div className="statscreen__section" style={{ marginTop: '0.75rem' }}>
            <h3 className="statscreen__section-title">EQUIPMENT</h3>
            {equippedItems.length > 0 ? (
              equippedItems.map((name, i) => (
                <div key={i} className="statscreen__row">
                  <span className="statscreen__row-value">{name}</span>
                </div>
              ))
            ) : (
              <p className="statscreen__none">Nothing equipped.</p>
            )}
            {(equipBonuses.ac > 0 || equipBonuses.attack > 0 || equipBonuses.damage > 0 || equipBonuses.hp > 0) && (
              <div style={{ marginTop: '0.3rem', borderTop: '1px solid #3a2818', paddingTop: '0.3rem' }}>
                {equipBonuses.ac > 0 && <div className="statscreen__row"><span className="statscreen__row-label">AC bonus</span><span className="statscreen__row-value">+{equipBonuses.ac}</span></div>}
                {equipBonuses.attack > 0 && <div className="statscreen__row"><span className="statscreen__row-label">Attack bonus</span><span className="statscreen__row-value">+{equipBonuses.attack}</span></div>}
                {equipBonuses.damage > 0 && <div className="statscreen__row"><span className="statscreen__row-label">Damage bonus</span><span className="statscreen__row-value">+{equipBonuses.damage}</span></div>}
                {equipBonuses.hp > 0 && <div className="statscreen__row"><span className="statscreen__row-label">HP bonus</span><span className="statscreen__row-value">+{equipBonuses.hp}</span></div>}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div>
          {/* Perks */}
          <div className="statscreen__section">
            <h3 className="statscreen__section-title">PERKS</h3>
            {perkNames.length > 0 ? (
              <ul className="statscreen__perk-list">
                {perkNames.map((name, i) => <li key={i}>{name}</li>)}
              </ul>
            ) : (
              <p className="statscreen__none">No perks chosen yet.</p>
            )}
          </div>

          {/* Companion */}
          <div className="statscreen__section" style={{ marginTop: '0.75rem' }}>
            <h3 className="statscreen__section-title">COMPANION</h3>
            {companion ? (
              <>
                <div className="statscreen__row statscreen__row--highlight">
                  <span className="statscreen__row-label">Name</span>
                  <span className="statscreen__row-value">{companion.name}</span>
                </div>
                <div className="statscreen__row">
                  <span className="statscreen__row-label">Bonus</span>
                  <span className="statscreen__row-value">{companionBonusLabel(companion)}</span>
                </div>
              </>
            ) : (
              <p className="statscreen__none">Travelling alone.</p>
            )}
          </div>

          {/* Combat Stats */}
          <div className="statscreen__section" style={{ marginTop: '0.75rem' }}>
            <h3 className="statscreen__section-title">COMBAT RECORD</h3>
            <div className="statscreen__row">
              <span className="statscreen__row-label">Total Kills</span>
              <span className="statscreen__row-value">{totalKills}</span>
            </div>
            <div className="statscreen__row">
              <span className="statscreen__row-label">Total Deaths</span>
              <span className="statscreen__row-value">{totalDeaths}</span>
            </div>
            <div className="statscreen__row">
              <span className="statscreen__row-label">Bosses Slain</span>
              <span className="statscreen__row-value">{bossesKilled.length}</span>
            </div>
          </div>

          {/* Exploration */}
          <div className="statscreen__section" style={{ marginTop: '0.75rem' }}>
            <h3 className="statscreen__section-title">EXPLORATION</h3>
            <div className="statscreen__row">
              <span className="statscreen__row-label">Zones Visited</span>
              <span className="statscreen__row-value">{zonesVisited.size}</span>
            </div>
            <div className="statscreen__row">
              <span className="statscreen__row-label">Quests Completed</span>
              <span className="statscreen__row-value">{questsCompleted}</span>
            </div>
            <div className="statscreen__row statscreen__row--highlight">
              <span className="statscreen__row-label">Current Rank</span>
              <span className="statscreen__row-value" style={{ color: rank.color }}>[{rank.label}] {rank.name}</span>
            </div>
          </div>

          {/* Heart Pieces */}
          <div className="statscreen__section" style={{ marginTop: '0.75rem' }}>
            <h3 className="statscreen__section-title">HEART PIECES</h3>
            <div className="statscreen__row">
              <span className="statscreen__row-label">Collected</span>
              <span className="statscreen__row-value">{heartPieces}/8</span>
            </div>
            <div className="statscreen__row">
              <span className="statscreen__row-label">HP Bonus</span>
              <span className="statscreen__row-value">+{getHeartPieceHpBonus(heartPieces)}</span>
            </div>
            {heartPieces % 4 !== 0 && (
              <div className="statscreen__row">
                <span className="statscreen__row-label">Next +5 HP</span>
                <span className="statscreen__row-value">{4 - (heartPieces % 4)} more</span>
              </div>
            )}
          </div>

          {/* Dungeon Items */}
          {dungeonItems.size > 0 && (
            <div className="statscreen__section" style={{ marginTop: '0.75rem' }}>
              <h3 className="statscreen__section-title">DUNGEON ITEMS</h3>
              {Array.from(dungeonItems).map(key => {
                const item = DUNGEON_ITEMS[key];
                return item ? (
                  <div key={key} className="statscreen__row">
                    <span className="statscreen__row-label">{item.icon} {item.name}</span>
                    <span className="statscreen__row-value" style={{ fontSize: '0.65rem', color: '#8a7a48' }}>{item.description}</span>
                  </div>
                ) : null;
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
