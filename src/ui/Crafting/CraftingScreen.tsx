import { useState } from 'react';
import { useInventoryStore } from '../../state/inventoryStore';
import { usePlayerStore } from '../../state/playerStore';
import { useQuestStore } from '../../state/questStore';
import { useAchievementStore } from '../../state/achievementStore';
import { useCommissionStore } from '../../state/commissionStore';
import { RECIPES, COMMISSION_MAP, type CraftingRecipe } from '../../engine/crafting';
import { getCurrentRank, RANKS } from '../../engine/ranks';
import { getItem } from '../../engine/items';
import './CraftingScreen.css';

/** Maps result item keys to the class keys they are recommended for. */
const WEAPON_CLASS_MAP: Record<string, string[]> = {
  hunting_bow: ['ranger'],
  shadow_dagger: ['rogue'],
  iron_mace: ['cleric'],
  runed_staff: ['wizard'],
  silver_rapier: ['bard'],
  iron_sword: ['fighter'],
  steel_sword: ['fighter'],
  leather_armor: ['fighter', 'rogue', 'wizard', 'cleric', 'ranger', 'bard'],
  chainmail: ['fighter', 'rogue', 'wizard', 'cleric', 'ranger', 'bard'],
};

interface Props { onClose: () => void; }

export function CraftingScreen({ onClose }: Props) {
  const character = usePlayerStore((s) => s.character);
  usePlayerStore((s) => s.version);
  const slots = useInventoryStore((s) => s.slots);
  const addItem = useInventoryStore((s) => s.addItem);
  const removeItem = useInventoryStore((s) => s.removeItem);
  const active = useQuestStore((s) => s.active);

  const commissions = useCommissionStore((s) => s.commissions);
  const transitionCount = useCommissionStore((s) => s.transitionCount);

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

  function canCommission(recipe: CraftingRecipe): boolean {
    if (!meetsRank(recipe)) return false;
    const commCost = Math.floor(recipe.goldCost * 1.5);
    if (character!.gold < commCost) return false;
    for (const ing of recipe.ingredients) {
      if (getOwned(ing.itemKey) < ing.quantity) return false;
    }
    return true;
  }

  function doCraft(recipe: CraftingRecipe) {
    if (!canCraft(recipe)) return;
    for (const ing of recipe.ingredients) {
      removeItem(ing.itemKey, ing.quantity);
    }
    character!.loseGold(recipe.goldCost);
    usePlayerStore.getState().notify();
    addItem(recipe.resultItemKey, recipe.resultQuantity);
    useAchievementStore.getState().recordCraft();
    const resultItem = getItem(recipe.resultItemKey);
    setFlash(`Crafted ${resultItem.name}!`);
    setTimeout(() => setFlash(null), 1500);
  }

  function doCommission(recipe: CraftingRecipe) {
    const mapping = COMMISSION_MAP[recipe.key];
    if (!mapping || !canCommission(recipe)) return;
    const commCost = Math.floor(recipe.goldCost * 1.5);
    // Deduct materials
    for (const ing of recipe.ingredients) {
      removeItem(ing.itemKey, ing.quantity);
    }
    // Deduct gold (50% more)
    character!.loseGold(commCost);
    usePlayerStore.getState().notify();

    const resultItem = getItem(mapping.resultItemKey);
    const store = useCommissionStore.getState();
    store.place({
      recipeKey: recipe.key,
      resultItemKey: mapping.resultItemKey,
      resultName: resultItem.name,
      readyAtTransition: store.transitionCount + mapping.transitions,
    });

    useAchievementStore.getState().recordCraft();
    setFlash(`Commissioned ${resultItem.name}. Return in ${mapping.transitions} days.`);
    setTimeout(() => setFlash(null), 2000);
  }

  function collectCommission(id: string) {
    const commission = useCommissionStore.getState().collect(id);
    if (commission) {
      addItem(commission.resultItemKey);
      setFlash(`Kael's work is done. ${commission.resultName} acquired.`);
      setTimeout(() => setFlash(null), 2000);
    }
  }

  const statLabels: Array<{ key: string; label: string }> = [
    { key: 'attack', label: 'ATK' },
    { key: 'damage', label: 'DMG' },
    { key: 'ac', label: 'AC' },
    { key: 'hp', label: 'HP' },
    { key: 'mp', label: 'MP' },
  ];

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
          const bonuses = resultItem.statBonus ?? {};
          const recommended = WEAPON_CLASS_MAP[recipe.resultItemKey]?.includes(character.characterClass.key);

          const commMapping = COMMISSION_MAP[recipe.key];
          const commCost = Math.floor(recipe.goldCost * 1.5);
          const commAffordable = character.gold >= commCost;
          const commCraftable = commMapping ? canCommission(recipe) : false;

          return (
            <li key={recipe.key} className={`craft__recipe${!rankOk ? ' is-locked' : ''}`}>
              <div className="craft__recipe-header">
                <h3>
                  {recipe.name}
                  {recommended && (
                    <span style={{ color: '#d4a968', fontSize: '0.8em', marginLeft: '8px' }}>&#9733; Recommended</span>
                  )}
                </h3>
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
                  {statLabels.map(({ key, label }) => {
                    const val = (bonuses as Record<string, number | undefined>)[key];
                    return val ? (
                      <span key={key} style={{ color: '#60c060', marginLeft: '6px' }}>+{val} {label}</span>
                    ) : null;
                  })}
                </span>
                {resultItem.description && (
                  <span className="craft__result-desc" style={{ display: 'block', fontStyle: 'italic', color: '#a0a0a0', fontSize: '0.85em', marginTop: '2px' }}>
                    {resultItem.description}
                  </span>
                )}
                <span className={`craft__cost${!affordable ? ' not-enough' : ''}`} style={{ color: affordable ? '#f4d488' : '#c04040' }}>
                  Cost: {recipe.goldCost}g
                </span>
                <div className="craft__actions">
                  <button
                    type="button"
                    className="craft__btn"
                    disabled={!craftable}
                    onClick={() => doCraft(recipe)}
                  >
                    Craft
                  </button>
                  {commMapping && (
                    <button
                      type="button"
                      className="craft__btn craft__btn--commission"
                      disabled={!commCraftable}
                      onClick={() => doCommission(recipe)}
                      title={`Superior result after ${commMapping.transitions} zone transitions. Costs ${commCost}g.`}
                    >
                      Commission ({commCost}g)
                    </button>
                  )}
                </div>
              </div>
              {commMapping && (
                <div className="craft__commission-hint">
                  <span className="craft__comm-label">Commission:</span>{' '}
                  {getItem(commMapping.resultItemKey).name}
                  {statLabels.map(({ key, label }) => {
                    const commItem = getItem(commMapping.resultItemKey);
                    const val = (commItem.statBonus as Record<string, number | undefined> ?? {})[key];
                    return val ? (
                      <span key={key} style={{ color: '#d4a968', marginLeft: '6px' }}>+{val} {label}</span>
                    ) : null;
                  })}
                  <span style={{ color: '#8a7a48', marginLeft: '8px', fontStyle: 'italic' }}>
                    ({commMapping.transitions} days)
                  </span>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {commissions.length > 0 && (
        <div className="craft__commissions">
          <h3>Kael's Workshop</h3>
          {commissions.map(c => {
            const elapsed = Math.min(
              transitionCount - c.placedAtTransition,
              c.readyAtTransition - c.placedAtTransition,
            );
            const total = c.readyAtTransition - c.placedAtTransition;
            const ready = transitionCount >= c.readyAtTransition;
            return (
              <div key={c.id} className={`craft__commission${ready ? ' is-ready' : ''}`}>
                <span className="craft__comm-name">{c.resultName}</span>
                {ready ? (
                  <button className="craft__btn" onClick={() => collectCommission(c.id)}>Collect</button>
                ) : (
                  <span className="craft__comm-progress">{elapsed}/{total} days</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {flash && <div className="craft__flash">{flash}</div>}
    </div>
  );
}
