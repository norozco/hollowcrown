import { useInventoryStore } from '../../state/inventoryStore';
import { usePlayerStore } from '../../state/playerStore';
import { SHOP_INVENTORY, getItem } from '../../engine/items';
import './InventoryScreen.css';

const RARITY_COLOR: Record<string, string> = {
  common: '#c0b8a0', uncommon: '#60c060', rare: '#4090e0',
  epic: '#a060d0', legendary: '#e0a030',
};

interface Props { onClose: () => void; }

export function ShopScreen({ onClose }: Props) {
  const buy = useInventoryStore((s) => s.buy);
  const character = usePlayerStore((s) => s.character);
  usePlayerStore((s) => s.version);

  if (!character) return null;

  const items = SHOP_INVENTORY.map((k) => getItem(k));

  return (
    <div className="inv" role="dialog" aria-label="Shop">
      <div className="inv__header">
        <h2>General Store — Vira</h2>
        <span className="inv__gold">◆ {character.gold}g</span>
        <button type="button" className="inv__close" onClick={onClose}>✕</button>
      </div>
      <div className="inv__body" style={{ gridTemplateColumns: '1fr' }}>
        <div className="inv__bag">
          <h3>Wares</h3>
          <ul className="inv__bag-list">
            {items.map((item) => {
              const canAfford = character.gold >= item.buyPrice;
              return (
                <li key={item.key} className="inv__bag-item">
                  <span className="inv__item-name" style={{ color: RARITY_COLOR[item.rarity] }} title={item.description}>
                    {item.name}
                    <span className="inv__qty"> — {item.description}</span>
                  </span>
                  <button
                    type="button"
                    className="inv__act-btn"
                    disabled={!canAfford}
                    onClick={() => buy(item.key)}
                    style={{ opacity: canAfford ? 1 : 0.4 }}
                  >
                    Buy {item.buyPrice}g
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
