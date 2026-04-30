/**
 * Reachability test for the eight perked weapons.
 *
 * Each weapon item key must appear in at least one of:
 *   - a `RECIPES` entry's `resultItemKey` (smithy crafting)
 *   - a monster's `loot[].itemKey` (drop table)
 *   - the `SHOP_INVENTORY` array (merchant stock)
 *
 * If this test fails, a perked weapon item exists in the database but
 * has no in-world acquisition path — the player can never legitimately
 * obtain one. Wire it up before shipping.
 */
import { describe, it, expect } from 'vitest';
import { RECIPES } from '../crafting';
import { ALL_MONSTERS } from '../monster';
import { SHOP_INVENTORY } from '../items';

const PERKED_WEAPON_KEYS = [
  'flamebrand',
  'vampiric_dagger',
  'stormpiercer',
  'blackthorn',
  'glasscutter',
  'whisper_edge',
  'sun_forged_hammer',
  'marauders_greataxe',
] as const;

function findSource(itemKey: string): { kind: 'recipe' | 'drop' | 'shop'; via: string } | null {
  const recipe = RECIPES.find((r) => r.resultItemKey === itemKey);
  if (recipe) return { kind: 'recipe', via: recipe.key };

  for (const m of ALL_MONSTERS) {
    if (m.loot.some((l) => l.itemKey === itemKey)) {
      return { kind: 'drop', via: m.key };
    }
  }

  if (SHOP_INVENTORY.includes(itemKey)) {
    return { kind: 'shop', via: 'general_store' };
  }

  return null;
}

describe('Perked weapon reachability', () => {
  it.each(PERKED_WEAPON_KEYS)(
    '%s has at least one in-world source (recipe / drop / shop)',
    (itemKey) => {
      const source = findSource(itemKey);
      expect(
        source,
        `Weapon "${itemKey}" is unreachable — wire it into a recipe, drop table, or SHOP_INVENTORY.`,
      ).not.toBeNull();
    },
  );
});
