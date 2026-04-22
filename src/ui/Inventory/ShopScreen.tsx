import * as React from 'react';
import { useState, useEffect } from 'react';
import { useInventoryStore } from '../../state/inventoryStore';
import { usePlayerStore } from '../../state/playerStore';
import { SHOP_INVENTORY, getItem, type Item } from '../../engine/items';
import './InventoryScreen.css';

const RARITY_COLOR: Record<string, string> = {
  common: '#c0b8a0', uncommon: '#60c060', rare: '#4090e0',
  epic: '#a060d0', legendary: '#e0a030',
};

/** Stat-delta comparison vs. the player's currently equipped item in that slot. */
function renderComparison(newItem: Item, currentItem: Item | null): React.JSX.Element {
  const newB = newItem.statBonus ?? {};
  const curB = currentItem?.statBonus ?? {};

  const stats: Array<{ key: keyof typeof newB; label: string }> = [
    { key: 'attack', label: 'ATK' },
    { key: 'damage', label: 'DMG' },
    { key: 'ac',     label: 'AC'  },
    { key: 'hp',     label: 'HP'  },
    { key: 'mp',     label: 'MP'  },
  ];

  const lines = stats
    .map(({ key, label }) => {
      const diff = (newB[key] ?? 0) - (curB[key] ?? 0);
      if (diff === 0) return null;
      const cls  = diff > 0 ? 'inv__tt-better' : 'inv__tt-worse';
      const sign = diff > 0 ? '+' : '';
      return (
        <span key={key} className={cls} style={{ marginRight: '0.4rem' }}>
          {sign}{diff} {label}
        </span>
      );
    })
    .filter(Boolean);

  return (
    <>
      <div style={{ color: '#8a7a48', fontSize: '0.78rem', marginBottom: '0.1rem' }}>
        vs. {currentItem ? currentItem.name : 'empty slot'}
      </div>
      {lines.length > 0 ? (
        <div style={{ fontSize: '0.85rem' }}>{lines}</div>
      ) : (
        <span className="inv__tt-same" style={{ fontSize: '0.85rem' }}>no stat difference</span>
      )}
    </>
  );
}

interface Props { onClose: () => void; }

export function ShopScreen({ onClose }: Props) {
  const buy = useInventoryStore((s) => s.buy);
  const sellJunk = useInventoryStore((s) => s.sellJunk);
  const equipment = useInventoryStore((s) => s.equipment);
  const character = usePlayerStore((s) => s.character);
  usePlayerStore((s) => s.version);
  const [junkToast, setJunkToast] = useState<string | null>(null);
  const [hovered, setHovered] = useState<Item | null>(null);
  const [altHeld, setAltHeld] = useState(false);

  // Track Alt key for comparison tooltip
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (e.key === 'Alt') setAltHeld(true); };
    const up = (e: KeyboardEvent) => { if (e.key === 'Alt') setAltHeld(false); };
    const blur = () => setAltHeld(false);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', blur);
    };
  }, []);

  if (!character) return null;

  const items = SHOP_INVENTORY.map((k) => getItem(k));

  const handleSellJunk = () => {
    const gold = sellJunk();
    if (gold > 0) setJunkToast(`Sold junk for ${gold}g`);
    else setJunkToast('No junk to sell');
    window.setTimeout(() => setJunkToast(null), 2500);
  };

  const showCompare = altHeld && hovered && hovered.equipSlot;
  const currentEquipped = hovered?.equipSlot ? equipment[hovered.equipSlot] : null;

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
      <div style={{ padding: '0.2rem 1rem', fontSize: '0.75rem', color: '#8a7a48' }}>
        Hold <strong>Alt</strong> while hovering weapons/armor to compare with equipped gear.
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
                <li
                  key={item.key}
                  className="inv__bag-item"
                  onMouseEnter={() => setHovered(item)}
                  onMouseLeave={() => setHovered((h) => (h?.key === item.key ? null : h))}
                >
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

      {showCompare && hovered && (
        <div className="inv__tooltip" style={{ position: 'fixed', right: '2rem', top: '6rem' }}>
          <h4 style={{ color: RARITY_COLOR[hovered.rarity] }}>{hovered.name}</h4>
          <p className="inv__tt-type">{hovered.rarity} {hovered.type}</p>
          <p className="inv__tt-desc">{hovered.description}</p>
          {hovered.statBonus && (
            <p className="inv__tt-stats">
              {hovered.statBonus.ac && `+${hovered.statBonus.ac} AC `}
              {hovered.statBonus.attack && `+${hovered.statBonus.attack} ATK `}
              {hovered.statBonus.damage && `+${hovered.statBonus.damage} DMG `}
              {hovered.statBonus.hp && `+${hovered.statBonus.hp} HP `}
              {hovered.statBonus.mp && `+${hovered.statBonus.mp} MP `}
            </p>
          )}
          <div className="inv__tt-compare">
            {renderComparison(hovered, currentEquipped ?? null)}
          </div>
          <p className="inv__tt-price">Buy: {hovered.buyPrice}g</p>
        </div>
      )}
    </div>
  );
}
