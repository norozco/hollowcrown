import { useInventoryStore } from '../../state/inventoryStore';
import { usePlayerStore } from '../../state/playerStore';
import type { EquipSlot } from '../../engine/items';
import './InventoryScreen.css';

const EQUIP_SLOTS: { slot: EquipSlot; label: string }[] = [
  { slot: 'head', label: 'Head' },
  { slot: 'chest', label: 'Chest' },
  { slot: 'legs', label: 'Legs' },
  { slot: 'boots', label: 'Boots' },
  { slot: 'mainHand', label: 'Weapon' },
  { slot: 'offHand', label: 'Off-Hand' },
  { slot: 'ring1', label: 'Ring 1' },
  { slot: 'ring2', label: 'Ring 2' },
  { slot: 'amulet', label: 'Amulet' },
];

const RARITY_COLOR: Record<string, string> = {
  common: '#c0b8a0', uncommon: '#60c060', rare: '#4090e0',
  epic: '#a060d0', legendary: '#e0a030',
};

export function InventoryScreen() {
  const { slots, equipment, close, useItem, equip, unequip, sell } = useInventoryStore();
  const character = usePlayerStore((s) => s.character);
  usePlayerStore((s) => s.version);

  if (!character) return null;

  return (
    <div className="inv" role="dialog" aria-label="Inventory">
      <div className="inv__header">
        <h2>Inventory</h2>
        <span className="inv__gold">◆ {character.gold}g</span>
        <button type="button" className="inv__close" onClick={close}>✕</button>
      </div>

      <div className="inv__body">
        {/* Equipment panel */}
        <div className="inv__equip">
          <h3>Equipment</h3>
          <ul className="inv__equip-list">
            {EQUIP_SLOTS.map(({ slot, label }) => {
              const item = equipment[slot];
              return (
                <li key={slot} className="inv__equip-slot">
                  <span className="inv__slot-label">{label}</span>
                  {item ? (
                    <button
                      type="button"
                      className="inv__item-btn"
                      style={{ color: RARITY_COLOR[item.rarity] }}
                      onClick={() => unequip(slot)}
                      title={`${item.description}\nClick to unequip`}
                    >
                      {item.name}
                    </button>
                  ) : (
                    <span className="inv__empty">— empty —</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* Bag panel */}
        <div className="inv__bag">
          <h3>Bag ({slots.length}/30)</h3>
          {slots.length === 0 ? (
            <p className="inv__empty-bag">Your bag is empty.</p>
          ) : (
            <ul className="inv__bag-list">
              {slots.map((s, i) => (
                <li key={`${s.item.key}-${i}`} className="inv__bag-item">
                  <span
                    className="inv__item-name"
                    style={{ color: RARITY_COLOR[s.item.rarity] }}
                    title={s.item.description}
                  >
                    {s.item.name}
                    {s.quantity > 1 && <span className="inv__qty"> ×{s.quantity}</span>}
                  </span>
                  <span className="inv__item-actions">
                    {s.item.type === 'consumable' && (
                      <button type="button" className="inv__act-btn" onClick={() => useItem(s.item.key)}>Use</button>
                    )}
                    {s.item.equipSlot && (
                      <button type="button" className="inv__act-btn" onClick={() => equip(s.item.key)}>Equip</button>
                    )}
                    <button type="button" className="inv__act-btn inv__act-sell" onClick={() => sell(s.item.key)}>
                      Sell {Math.floor(s.item.buyPrice * 0.5)}g
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
