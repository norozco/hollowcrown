import { useState } from 'react';
import { useInventoryStore } from '../../state/inventoryStore';
import { usePlayerStore } from '../../state/playerStore';
import { COOKING_RECIPES, type Recipe } from '../../engine/cooking';
import { getItem } from '../../engine/items';
import './CookingScreen.css';

interface Props { onClose: () => void; }

export function CookingScreen({ onClose }: Props) {
  const character = usePlayerStore((s) => s.character);
  usePlayerStore((s) => s.version);
  const slots = useInventoryStore((s) => s.slots);
  const addItem = useInventoryStore((s) => s.addItem);
  const removeItem = useInventoryStore((s) => s.removeItem);

  const [flash, setFlash] = useState<string | null>(null);

  if (!character) return null;

  function getOwned(itemKey: string): number {
    const slot = slots.find((s) => s.item.key === itemKey);
    return slot ? slot.quantity : 0;
  }

  function canCook(recipe: Recipe): boolean {
    if (character!.gold < recipe.goldCost) return false;
    for (const ing of recipe.ingredients) {
      if (getOwned(ing) < 1) return false;
    }
    return true;
  }

  function doCook(recipe: Recipe) {
    if (!canCook(recipe)) return;
    for (const ing of recipe.ingredients) {
      removeItem(ing, 1);
    }
    character!.loseGold(recipe.goldCost);
    usePlayerStore.getState().notify();
    addItem(recipe.resultItemKey, 1);
    const resultItem = getItem(recipe.resultItemKey);
    setFlash(`Cooked ${resultItem.name}!`);
    setTimeout(() => setFlash(null), 1500);
  }

  return (
    <div className="cook" role="dialog" aria-label="Cooking">
      <div className="cook__header">
        <h2>Inn — Cooking</h2>
        <span className="cook__gold">&#9670; {character.gold}g</span>
        <button type="button" className="cook__close" onClick={onClose}>&#10005;</button>
      </div>
      <ul className="cook__list">
        {COOKING_RECIPES.map((recipe) => {
          const affordable = character.gold >= recipe.goldCost;
          const cookable = canCook(recipe);
          const resultItem = getItem(recipe.resultItemKey);

          return (
            <li key={recipe.key} className="cook__recipe">
              <div className="cook__recipe-header">
                <h3>{recipe.name}</h3>
              </div>
              <p className="cook__desc">{recipe.description}</p>
              <div className="cook__ingredients">
                {recipe.ingredients.map((ingKey, idx) => {
                  const owned = getOwned(ingKey);
                  const enough = owned >= 1;
                  const ingItem = getItem(ingKey);
                  return (
                    <span
                      key={`${ingKey}-${idx}`}
                      className={`cook__ingredient ${enough ? 'has-enough' : 'not-enough'}`}
                    >
                      {ingItem.name} {owned}/1
                    </span>
                  );
                })}
              </div>
              <div className="cook__footer">
                <span className="cook__result">
                  Result: {resultItem.name}
                  {resultItem.effect?.healHp ? (
                    <span style={{ color: '#60c060', marginLeft: '6px' }}>+{resultItem.effect.healHp} HP</span>
                  ) : null}
                  {resultItem.effect?.healMp ? (
                    <span style={{ color: '#6090e0', marginLeft: '6px' }}>+{resultItem.effect.healMp} MP</span>
                  ) : null}
                  {resultItem.effect?.buffAc ? (
                    <span style={{ color: '#d4a968', marginLeft: '6px' }}>+{resultItem.effect.buffAc} AC</span>
                  ) : null}
                </span>
                {resultItem.description && (
                  <span className="cook__result-desc">{resultItem.description}</span>
                )}
                <span className={`cook__cost${!affordable ? ' not-enough' : ''}`}>Cost: {recipe.goldCost}g</span>
                <div className="cook__actions">
                  <button
                    type="button"
                    className="cook__btn"
                    disabled={!cookable}
                    onClick={() => doCook(recipe)}
                  >
                    Cook
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      {flash && <div className="cook__flash">{flash}</div>}
    </div>
  );
}
