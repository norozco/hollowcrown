import { useEffect, useState } from 'react';
import './ItemDiscovery.css';

interface DiscoveredItem {
  name: string;
  rarity: string;
  description: string;
}

const RARITY_COLORS: Record<string, string> = {
  rare: '#4080c0',
  epic: '#a040c0',
  legendary: '#e0a020',
};

const RARITY_LABELS: Record<string, string> = {
  rare: 'RARE FIND',
  epic: 'EPIC DISCOVERY',
  legendary: 'LEGENDARY',
};

/**
 * Centred popup that fires when a rare, epic, or legendary item enters the inventory.
 * Listens for the `rareItemFound` custom event dispatched by inventoryStore.addItem().
 * Auto-dismisses after 3.5 s or immediately on click.
 */
export function ItemDiscovery() {
  const [item, setItem] = useState<DiscoveredItem | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      setItem((e as CustomEvent<DiscoveredItem>).detail);
      setTimeout(() => setItem(null), 3500);
    };
    window.addEventListener('rareItemFound', handler);
    return () => window.removeEventListener('rareItemFound', handler);
  }, []);

  if (!item) return null;

  const color = RARITY_COLORS[item.rarity] ?? '#ffffff';
  const label = RARITY_LABELS[item.rarity] ?? item.rarity.toUpperCase();

  return (
    <div
      className="discovery"
      onClick={() => setItem(null)}
      role="dialog"
      aria-label={`Item discovered: ${item.name}`}
    >
      <div
        className="discovery__card"
        style={{ borderColor: color, boxShadow: `0 0 24px ${color}66, 0 0 6px ${color}44` }}
      >
        <div className="discovery__label">ITEM FOUND</div>
        <div className="discovery__rarity" style={{ color }}>
          {label}
        </div>
        <h3 className="discovery__name" style={{ color }}>
          {item.name}
        </h3>
        <p className="discovery__desc">{item.description}</p>
        <div className="discovery__dismiss">click to dismiss</div>
      </div>
    </div>
  );
}
