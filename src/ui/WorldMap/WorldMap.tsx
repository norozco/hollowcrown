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
];

// SVG canvas dimensions
const W = 680;
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
