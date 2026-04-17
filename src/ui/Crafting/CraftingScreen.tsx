import { useState } from 'react';
import { useInventoryStore } from '../../state/inventoryStore';
import { usePlayerStore } from '../../state/playerStore';
import { useQuestStore } from '../../state/questStore';
import { RECIPES, type CraftingRecipe } from '../../engine/crafting';
import { getCurrentRank, RANKS } from '../../engine/ranks';
import { getItem } from '../../engine/items';
import './CraftingScreen.css';

interface Props { onClose: () => void; }

export function CraftingScreen({ onClose }: Props) {
  const character = usePlayerStore((s) => s.character);
  usePlayerStore((s) => s.version);
  const slots = useInventoryStore((s) => s.slots);
  const addItem = useInventoryStore((s) => s.addItem);
  const removeItem = useInventoryStore((s) => s.removeItem);
  const active = useQuestStore((s) => s.active);

  const [flash, setFlash] = useState<string | null>(null);

  if (!character) return null;

  const questsCompleted = Object.values(active).filter((q) => q.turnedIn).length;
  const rank = getCurrentRank(questsCompleted, character.level);

  function getOwned(itemKey: string): number {
    const slot = slots.find((s) => s.item.key === itemKey);
    return slot ? slot.quantity : 0;
  }

  function meetsRank(recipe: CraftingRecipe): boolean {
    if (!recipe.requiredRank) return true;
    const reqIdx = RANKS.findIndex((r) => r.key === recipe.requiredRank);
    const curIdx = RANKS.findIndex((r) => r.key === rank.key);
    return curIdx >= reqIdx;
  }

  function canCraft(recipe: CraftingRecipe): boolean {
    if (!meetsRank(recipe)) return false;
    if (character!.gold < recipe.goldCost) return false;
    for (const ing of recipe.ingredients) {
      if (getOwned(ing.itemKey) < ing.quantity) return false;
    }
    return true;
  }

  function doCraft(recipe: CraftingRecipe) {
    if (!canCraft(recipe)) return;
    // Deduct ingredients
    for (const ing of recipe.ingredients) {
      removeItem(ing.itemKey, ing.quantity);
    }
    // Deduct gold
    character!.loseGold(recipe.goldCost);
    usePlayerStore.getState().notify();
    // Add result
    addItem(recipe.resultItemKey, recipe.resultQuantity);
    // Flash
    const resultItem = getItem(recipe.resultItemKey);
    setFlash(`Crafted ${resultItem.name}!`);
    setTimeout(() => setFlash(null), 1500);
  }

  return (
    <div className="craft" role="dialog" aria-label="Crafting">
      <div className="craft__header">
        <h2>Smithy — Crafting</h2>
        <span className="craft__gold">&#9670; {character.gold}g</span>
        <button type="button" className="craft__close" onClick={onClose}>&#10005;</button>
      </div>
      <ul className="craft__list">
        {RECIPES.map((recipe) => {
          const rankOk = meetsRank(recipe);
          const affordable = character.gold >= recipe.goldCost;
          const craftable = canCraft(recipe);
          const resultItem = getItem(recipe.resultItemKey);

          return (
            <li key={recipe.key} className={`craft__recipe${!rankOk ? ' is-locked' : ''}`}>
              <div className="craft__recipe-header">
                <h3>{recipe.name}</h3>
                {recipe.requiredRank && !rankOk && (
                  <span className="craft__rank-req">Requires Rank {recipe.requiredRank}</span>
                )}
              </div>
              <p className="craft__desc">{recipe.description}</p>
              <div className="craft__ingredients">
                {recipe.ingredients.map((ing) => {
                  const owned = getOwned(ing.itemKey);
                  const enough = owned >= ing.quantity;
                  const ingItem = getItem(ing.itemKey);
                  return (
                    <span
                      key={ing.itemKey}
                      className={`craft__ingredient ${enough ? 'has-enough' : 'not-enough'}`}
                    >
                      {ingItem.name} {owned}/{ing.quantity}
                    </span>
                  );
                })}
              </div>
              <div className="craft__footer">
                <span className="craft__result">
                  Result: {resultItem.name}{recipe.resultQuantity > 1 ? ` x${recipe.resultQuantity}` : ''}
                </span>
                <span className={`craft__cost${!affordable ? ' not-enough' : ''}`} style={{ color: affordable ? '#f4d488' : '#c04040' }}>
                  Cost: {recipe.goldCost}g
                </span>
                <button
                  type="button"
                  className="craft__btn"
                  disabled={!craftable}
                  onClick={() => doCraft(recipe)}
                >
                  Craft
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {flash && <div className="craft__flash">{flash}</div>}
    </div>
  );
}
