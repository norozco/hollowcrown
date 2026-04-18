import { useAchievementStore } from '../../state/achievementStore';
import './WorldMap.css';

interface Zone {
  key: string;
  name: string;
  x: number;
  y: number;
}

interface Connection {
  from: string;
  to: string;
}

const ZONES: Zone[] = [
  { key: 'TownScene',              name: 'Ashenvale',      x: 100, y: 120 },
  { key: 'GreenhollowScene',       name: 'Greenhollow',    x: 250, y: 120 },
  { key: 'MossbarrowScene',        name: 'Mossbarrow',     x: 400, y: 120 },
  { key: 'MossbarrowDepthsScene',  name: 'Depths F1',      x: 400, y: 210 },
  { key: 'DepthsFloor2Scene',      name: 'Catacombs',      x: 400, y: 280 },
  { key: 'DepthsFloor3Scene',      name: 'Hollow Throne',  x: 400, y: 350 },
  { key: 'AshenmereScene',         name: 'Ashenmere',      x: 560, y: 120 },
  { key: 'DrownedSanctumF1Scene',  name: 'Sanctum F1',     x: 560, y: 210 },
  { key: 'DrownedSanctumF2Scene',  name: 'Sanctum Heart',  x: 560, y: 280 },
  { key: 'DuskmereScene',          name: 'Duskmere',       x: 250, y: 230 },
  { key: 'AshfieldsScene',         name: 'Ashfields',      x: 700, y: 120 },
  { key: 'AshenTowerF1Scene',      name: 'Ashen Tower F1', x: 700, y: 210 },
  { key: 'AshenTowerF2Scene',      name: 'Ashen Tower F2', x: 700, y: 280 },
  { key: 'AshenTowerF3Scene',      name: 'Mirror Chamber', x: 700, y: 350 },
  { key: 'ShatteredCoastScene',    name: 'Shattered Coast',x: 840, y: 120 },
  { key: 'ThroneBeneathF1Scene',   name: 'The Descent',    x: 840, y: 210 },
  { key: 'ThroneBeneathF2Scene',   name: 'Hall of Names',  x: 840, y: 280 },
  { key: 'ThroneBeneathF3Scene',   name: 'Forgotten Throne',x: 840, y: 350 },
];

const CONNECTIONS: Connection[] = [
  { from: 'TownScene',             to: 'GreenhollowScene' },
  { from: 'GreenhollowScene',      to: 'MossbarrowScene' },
  { from: 'MossbarrowScene',       to: 'MossbarrowDepthsScene' },
  { from: 'MossbarrowDepthsScene', to: 'DepthsFloor2Scene' },
  { from: 'DepthsFloor2Scene',     to: 'DepthsFloor3Scene' },
  { from: 'MossbarrowScene',       to: 'AshenmereScene' },
  { from: 'AshenmereScene',        to: 'DrownedSanctumF1Scene' },
  { from: 'DrownedSanctumF1Scene', to: 'DrownedSanctumF2Scene' },
  { from: 'TownScene',             to: 'DuskmereScene' },
  { from: 'AshenmereScene',        to: 'AshfieldsScene' },
  { from: 'AshfieldsScene',        to: 'AshenTowerF1Scene' },
  { from: 'AshenTowerF1Scene',     to: 'AshenTowerF2Scene' },
  { from: 'AshenTowerF2Scene',     to: 'AshenTowerF3Scene' },
  { from: 'AshfieldsScene',        to: 'ShatteredCoastScene' },
  { from: 'ShatteredCoastScene',   to: 'ThroneBeneathF1Scene' },
  { from: 'ThroneBeneathF1Scene',  to: 'ThroneBeneathF2Scene' },
  { from: 'ThroneBeneathF2Scene',  to: 'ThroneBeneathF3Scene' },
];

// SVG canvas dimensions
const W = 920;
const H = 420;

interface Props {
  onClose: () => void;
}

export function WorldMap({ onClose }: Props) {
  const zonesVisited = useAchievementStore((s) => s.zonesVisited);

  const zoneByKey = Object.fromEntries(ZONES.map((z) => [z.key, z]));

  return (
    <div className="wmap" role="dialog" aria-label="World Map" onClick={onClose}>
      <div className="wmap__panel" onClick={(e) => e.stopPropagation()}>
        <div className="wmap__header">
          <span className="wmap__title">WORLD MAP</span>
          <button type="button" className="wmap__close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <svg
          className="wmap__svg"
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          aria-hidden="true"
        >
          {/* Connection lines */}
          {CONNECTIONS.map(({ from, to }) => {
            const a = zoneByKey[from];
            const b = zoneByKey[to];
            if (!a || !b) return null;
            const bothVisited = zonesVisited.has(from) && zonesVisited.has(to);
            const eitherVisited = zonesVisited.has(from) || zonesVisited.has(to);
            return (
              <line
                key={`${from}-${to}`}
                x1={a.x} y1={a.y}
                x2={b.x} y2={b.y}
                className={
                  bothVisited
                    ? 'wmap__line wmap__line--visited'
                    : eitherVisited
                    ? 'wmap__line wmap__line--partial'
                    : 'wmap__line wmap__line--hidden'
                }
              />
            );
          })}

          {/* Zone nodes */}
          {ZONES.map((zone) => {
            const visited = zonesVisited.has(zone.key);
            return (
              <g key={zone.key} className={visited ? 'wmap__node wmap__node--visited' : 'wmap__node wmap__node--hidden'}>
                <circle
                  cx={zone.x}
                  cy={zone.y}
                  r={visited ? 10 : 8}
                  className={visited ? 'wmap__circle wmap__circle--visited' : 'wmap__circle wmap__circle--hidden'}
                />
                <text
                  x={zone.x}
                  y={zone.y + 24}
                  textAnchor="middle"
                  className={visited ? 'wmap__label wmap__label--visited' : 'wmap__label wmap__label--hidden'}
                >
                  {visited ? zone.name : '???'}
                </text>
              </g>
            );
          })}
        </svg>

        <p className="wmap__hint">Discovered zones glow. Uncharted lands remain dark.</p>
      </div>
    </div>
  );
}
