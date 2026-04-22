import * as React from 'react';
import { useState } from 'react';
import { useInventoryStore } from '../../state/inventoryStore';
import { usePlayerStore } from '../../state/playerStore';
import type { EquipSlot, InventorySlot, Item, ItemType } from '../../engine/items';
import { getItemIcon } from './ItemIcons';
import './InventoryScreen.css';

const EQUIP_LAYOUT: { slot: EquipSlot; label: string; gridArea: string }[] = [
  { slot: 'head',    label: 'Head',    gridArea: 'head' },
  { slot: 'chest',   label: 'Chest',   gridArea: 'chest' },
  { slot: 'legs',    label: 'Legs',    gridArea: 'legs' },
  { slot: 'boots',   label: 'Boots',   gridArea: 'boots' },
  { slot: 'mainHand',label: 'Weapon',  gridArea: 'weapon' },
  { slot: 'offHand', label: 'Shield',  gridArea: 'offhand' },
  { slot: 'ring1',   label: 'Ring',    gridArea: 'ring1' },
  { slot: 'ring2',   label: 'Ring',    gridArea: 'ring2' },
  { slot: 'amulet',  label: 'Amulet',  gridArea: 'amulet' },
];

const RARITY_BORDER: Record<string, string> = {
  common: '#706858', uncommon: '#40a040', rare: '#4080e0',
  epic: '#a050d0', legendary: '#e0a020',
};

/** Render a stat-delta line with appropriate colour class. */
function renderComparison(newItem: Item, currentItem: Item | null): React.JSX.Element {
  const newB  = newItem.statBonus     ?? {};
  const curB  = currentItem?.statBonus ?? {};

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

export function InventoryScreen() {
  const { slots, equipment, close, useItem, equip, unequip, sell, sortBy, toggleFavorite, favorites, newItems, markSeen } = useInventoryStore();
  const character = usePlayerStore((s) => s.character);
  usePlayerStore((s) => s.version);
  const [tooltip, setTooltip] = useState<InventorySlot | null>(null);
  const [filter, setFilter] = useState<'all' | ItemType>('all');

  const TABS: { key: 'all' | ItemType; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'weapon', label: 'Weapons' },
    { key: 'armor', label: 'Armor' },
    { key: 'consumable', label: 'Consumables' },
    { key: 'material', label: 'Materials' },
    { key: 'quest', label: 'Quest' },
  ];

  const filteredSlots = filter === 'all' ? slots : slots.filter((s) => s.item.type === filter);

  if (!character) return null;

  return (
    <div className="inv" role="dialog" aria-label="Inventory">
      <div className="inv__topbar">
        <h2>Inventory</h2>
        <div className="inv__stats-bar">
          <span>HP {character.hp}/{character.derived.maxHp}</span>
          {character.derived.maxMp > 0 && <span>MP {character.mp}/{character.derived.maxMp}</span>}
          <span>AC {character.derived.ac}</span>
          <span className="inv__gold">◆ {character.gold}g</span>
        </div>
        <button type="button" className="inv__close" onClick={close}>✕</button>
      </div>

      <div className="inv__main">
        {/* Equipment silhouette */}
        <div className="inv__equip-panel">
          <h3>Equipment</h3>
          <div className="inv__equip-grid">
            {EQUIP_LAYOUT.map(({ slot, label, gridArea }) => {
              const item = equipment[slot];
              return (
                <div
                  key={slot}
                  className={`inv__equip-slot${item ? ' is-filled' : ''}`}
                  style={{
                    gridArea,
                    borderColor: item ? RARITY_BORDER[item.rarity] : '#3a2818',
                  }}
                  onClick={() => item && unequip(slot)}
                  title={item ? `${item.name}\n${item.description}\nClick to unequip` : label}
                >
                  {item ? (
                    <img src={getItemIcon(item.key)} alt={item.name} className="inv__icon" />
                  ) : (
                    <span className="inv__slot-label">{label}</span>
                  )}
                </div>
              );
            })}
            {/* Character silhouette in the center */}
            <div className="inv__silhouette">
              <div className="inv__sil-head" />
              <div className="inv__sil-body" />
              <div className="inv__sil-legs" />
            </div>
          </div>
        </div>

        {/* Bag grid */}
        <div className="inv__bag-panel">
          <div className="inv__bag-header">
            <h3>Bag ({slots.length}/30)</h3>
            <div className="inv__sort-bar">
              <span className="inv__sort-label">Sort:</span>
              <button type="button" className="inv__sort-btn" onClick={() => sortBy('type')}>Type</button>
              <button type="button" className="inv__sort-btn" onClick={() => sortBy('rarity')}>Rarity</button>
              <button type="button" className="inv__sort-btn" onClick={() => sortBy('name')}>Name</button>
            </div>
          </div>
          <div className="inv__tabs">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                className={`inv__tab${filter === t.key ? ' is-active' : ''}`}
                onClick={() => setFilter(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="inv__bag-grid">
            {filteredSlots.map((s, i) => (
              <div
                key={`${s.item.key}-${i}`}
                className={`inv__bag-cell${s.item.equipSlot ? ' inv__bag-cell--equippable' : ''}`}
                style={{ borderColor: RARITY_BORDER[s.item.rarity] }}
                onMouseEnter={() => { setTooltip(s); markSeen(s.item.key); }}
                onMouseLeave={() => setTooltip(null)}
              >
                <img src={getItemIcon(s.item.key)} alt={s.item.name} className="inv__icon" />
                {s.quantity > 1 && <span className="inv__qty">{s.quantity}</span>}
                {favorites.has(s.item.key) && <span className="inv__fav-mark" title="Favorited (locked from sale)">★</span>}
                {newItems.has(s.item.key) && (
                  <span
                    title={`NEW — picked up this session. Hover to mark seen.`}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      background: '#fce35a',
                      color: '#000',
                      fontFamily: 'Impact, sans-serif',
                      fontWeight: 'bold',
                      fontSize: '0.7rem',
                      padding: '0.05rem 0.3rem',
                      letterSpacing: '0.06em',
                      borderBottomRightRadius: '2px',
                      boxShadow: '1px 1px 0 #c52027',
                      zIndex: 2,
                      cursor: 'help',
                    }}
                  >
                    NEW
                  </span>
                )}
                <div className="inv__cell-actions">
                  {s.item.type === 'consumable' && (
                    <button type="button" onClick={() => useItem(s.item.key)}>Use</button>
                  )}
                  {s.item.equipSlot && (
                    <button type="button" onClick={() => equip(s.item.key)}>Equip</button>
                  )}
                  <button type="button" className="inv__fav-btn"
                    title={favorites.has(s.item.key) ? 'Unlock (allow sale)' : 'Favorite (lock from sale)'}
                    onClick={() => toggleFavorite(s.item.key)}>
                    {favorites.has(s.item.key) ? '★' : '☆'}
                  </button>
                  <button type="button" className="inv__sell-btn" onClick={() => sell(s.item.key)}>
                    {Math.floor(s.item.buyPrice * 0.5)}g
                  </button>
                </div>
              </div>
            ))}
            {/* Empty slots */}
            {filter === 'all' && Array.from({ length: Math.max(0, 30 - slots.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="inv__bag-cell inv__bag-empty" />
            ))}
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div className="inv__tooltip">
          <h4 style={{ color: RARITY_BORDER[tooltip.item.rarity] }}>{tooltip.item.name}</h4>
          {newItems.has(tooltip.item.key) && (
            <p
              style={{
                background: '#fce35a',
                color: '#000',
                fontFamily: 'Impact, sans-serif',
                fontWeight: 'bold',
                letterSpacing: '0.05em',
                padding: '0.15rem 0.4rem',
                margin: '0.15rem 0',
                borderLeft: '4px solid #c52027',
                fontSize: '0.8rem',
              }}
            >
              NEW — picked up during this session
            </p>
          )}
          <p className="inv__tt-type">{tooltip.item.rarity} {tooltip.item.type}</p>
          <p className="inv__tt-desc">{tooltip.item.description}</p>
          {tooltip.item.statBonus && (
            <p className="inv__tt-stats">
              {tooltip.item.statBonus.ac && `+${tooltip.item.statBonus.ac} AC `}
              {tooltip.item.statBonus.attack && `+${tooltip.item.statBonus.attack} ATK `}
              {tooltip.item.statBonus.damage && `+${tooltip.item.statBonus.damage} DMG `}
              {tooltip.item.statBonus.hp && `+${tooltip.item.statBonus.hp} HP `}
              {tooltip.item.statBonus.mp && `+${tooltip.item.statBonus.mp} MP `}
            </p>
          )}
          {tooltip.item.effect?.healHp && <p className="inv__tt-effect">Heals {tooltip.item.effect.healHp} HP</p>}
          {tooltip.item.effect?.healMp && <p className="inv__tt-effect">Restores {tooltip.item.effect.healMp} MP</p>}
          {tooltip.item.equipSlot && (
            <div className="inv__tt-compare">
              {renderComparison(tooltip.item, equipment[tooltip.item.equipSlot])}
            </div>
          )}
          <p className="inv__tt-price">Sell: {Math.floor(tooltip.item.buyPrice * 0.5)}g</p>
        </div>
      )}
    </div>
  );
}
