import { useState } from 'react';
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
  const sellJunk = useInventoryStore((s) => s.sellJunk);
  const character = usePlayerStore((s) => s.character);
  usePlayerStore((s) => s.version);
  const [junkToast, setJunkToast] = useState<string | null>(null);

  if (!character) return null;

  const items = SHOP_INVENTORY.map((k) => getItem(k));

  const handleSellJunk = () => {
    const gold = sellJunk();
    if (gold > 0) setJunkToast(`Sold junk for ${gold}g`);
    else setJunkToast('No junk to sell');
    window.setTimeout(() => setJunkToast(null), 2500);
  };

  return (
    <div className="inv" role="dialog" aria-label="Shop">
      <div className="inv__header">
        <h2>General Store — Vira</h2>
        <span className="inv__gold">◆ {character.gold}g</span>
        <button
          type="button"
          onClick={handleSellJunk}
          style={{
            marginLeft: '0.6rem',
            background: '#c52027',
            color: '#fce35a',
            border: '2px solid #fce35a',
            fontFamily: 'Impact, sans-serif',
            fontWeight: 'bold',
            letterSpacing: '0.08em',
            padding: '0.3rem 0.7rem',
            cursor: 'pointer',
            textTransform: 'uppercase',
          }}
          title="Sell all common materials (except favorited)"
        >
          Sell Junk
        </button>
        <button type="button" className="inv__close" onClick={onClose}>✕</button>
      </div>
      {junkToast && (
        <div
          role="status"
          style={{
            background: '#fce35a',
            color: '#1a0a0a',
            fontFamily: 'Impact, sans-serif',
            fontWeight: 'bold',
            padding: '0.5rem 1rem',
            margin: '0.4rem 1rem',
            borderLeft: '6px solid #c52027',
            letterSpacing: '0.05em',
          }}
        >
          {junkToast}
        </div>
      )}
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
