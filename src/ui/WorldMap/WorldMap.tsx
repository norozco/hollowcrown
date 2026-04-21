import { useAchievementStore } from '../../state/achievementStore';
import './WorldMap.css';

type ZoneType = 'town' | 'forest' | 'dungeon' | 'mountain' | 'coast' | 'volcano' | 'swamp';

interface Zone {
  key: string;
  name: string;
  x: number;
  y: number;
  type: ZoneType;
}

interface Connection {
  from: string;
  to: string;
}

const ZONES: Zone[] = [
  { key: 'TownScene',              name: 'Ashenvale',       x: 100, y: 120, type: 'town' },
  { key: 'GreenhollowScene',       name: 'Greenhollow',     x: 250, y: 120, type: 'forest' },
  { key: 'MossbarrowScene',        name: 'Mossbarrow',      x: 400, y: 120, type: 'swamp' },
  { key: 'MossbarrowDepthsScene',  name: 'Depths F1',       x: 400, y: 210, type: 'dungeon' },
  { key: 'DepthsFloor2Scene',      name: 'Catacombs',       x: 400, y: 280, type: 'dungeon' },
  { key: 'DepthsFloor3Scene',      name: 'Hollow Throne',   x: 400, y: 350, type: 'dungeon' },
  { key: 'AshenmereScene',         name: 'Ashenmere',       x: 560, y: 120, type: 'town' },
  { key: 'DrownedSanctumF1Scene',  name: 'Sanctum F1',      x: 560, y: 210, type: 'dungeon' },
  { key: 'DrownedSanctumF2Scene',  name: 'Sanctum Heart',   x: 560, y: 280, type: 'dungeon' },
  { key: 'DuskmereScene',          name: 'Duskmere',        x: 250, y: 230, type: 'forest' },
  { key: 'AshfieldsScene',         name: 'Ashfields',       x: 700, y: 120, type: 'volcano' },
  { key: 'AshenTowerF1Scene',      name: 'Ashen Tower F1',  x: 700, y: 210, type: 'mountain' },
  { key: 'AshenTowerF2Scene',      name: 'Ashen Tower F2',  x: 700, y: 280, type: 'mountain' },
  { key: 'AshenTowerF3Scene',      name: 'Mirror Chamber',  x: 700, y: 350, type: 'mountain' },
  { key: 'ShatteredCoastScene',    name: 'Shattered Coast', x: 840, y: 120, type: 'coast' },
  { key: 'ThroneBeneathF1Scene',   name: 'The Descent',     x: 840, y: 210, type: 'dungeon' },
  { key: 'ThroneBeneathF2Scene',   name: 'Hall of Names',   x: 840, y: 280, type: 'dungeon' },
  { key: 'ThroneBeneathF3Scene',   name: 'Forgotten Throne',x: 840, y: 350, type: 'dungeon' },
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

// ── Zone icon renderers (all SVG, centered on 0,0, approx 32x32) ─────────
function ZoneIcon({ type, visited }: { type: ZoneType; visited: boolean }) {
  const fill = visited ? '#5a3a1f' : '#4a3a2a';
  const accent = visited ? '#8a5a2a' : '#6a4a2a';
  const stroke = '#2a1a0a';
  const sw = 1.4;

  switch (type) {
    case 'town':
      return (
        <g>
          {/* chimney smoke */}
          <path d="M -4 -22 q 3 -4 0 -8 q -3 -4 0 -8" fill="none" stroke={accent} strokeWidth={1.2} opacity={0.55} />
          {/* castle tower */}
          <rect x={-9} y={-14} width={18} height={20} fill={fill} stroke={stroke} strokeWidth={sw} />
          {/* crenellations */}
          <path d="M -9 -14 v -4 h 4 v 4 M -2 -14 v -4 h 4 v 4 M 5 -14 v -4 h 4 v 4" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="miter" />
          {/* door */}
          <path d="M -3 6 v -6 a 3 3 0 0 1 6 0 v 6 z" fill={stroke} />
          {/* flag */}
          <line x1={0} y1={-22} x2={0} y2={-14} stroke={stroke} strokeWidth={1} />
          <path d="M 0 -22 l 6 2 l -6 2 z" fill="#c81e1e" stroke={stroke} strokeWidth={0.8} />
        </g>
      );
    case 'forest':
      return (
        <g>
          <path d="M -10 8 l 6 -18 l 6 18 z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <path d="M -2 8 l 7 -20 l 7 20 z" fill={accent} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <path d="M 4 8 l 4 -12 l 4 12 z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        </g>
      );
    case 'dungeon':
      return (
        <g>
          {/* broken arch */}
          <path d="M -12 8 v -10 a 12 12 0 0 1 24 0 v 10 M -4 -4 l 2 -6 M 6 -10 l -2 -4" fill="none" stroke={stroke} strokeWidth={sw * 1.3} strokeLinecap="round" />
          {/* skull hint */}
          <circle cx={0} cy={2} r={4.5} fill={fill} stroke={stroke} strokeWidth={sw} />
          <circle cx={-1.6} cy={1.6} r={0.9} fill={stroke} />
          <circle cx={1.6} cy={1.6} r={0.9} fill={stroke} />
          <path d="M -2 5 l 1 1 l 1 -1 l 1 1 l 1 -1" fill="none" stroke={stroke} strokeWidth={0.9} />
        </g>
      );
    case 'mountain':
      return (
        <g>
          <path d="M -14 10 l 8 -18 l 5 8 l 4 -6 l 10 16 z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          <path d="M -6 -8 l 2 4 l 4 -6" fill="none" stroke="#e8d8b8" strokeWidth={1.4} strokeLinecap="round" />
        </g>
      );
    case 'coast':
      return (
        <g>
          {/* cliff */}
          <path d="M -12 10 v -12 l 6 -4 l 6 4 v 12 z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          {/* waves */}
          <path d="M 0 8 q 3 -3 6 0 t 6 0" fill="none" stroke={accent} strokeWidth={1.3} strokeLinecap="round" />
          <path d="M -2 12 q 3 -3 6 0 t 6 0" fill="none" stroke={accent} strokeWidth={1.3} strokeLinecap="round" />
        </g>
      );
    case 'volcano':
      return (
        <g>
          <path d="M -14 10 l 9 -16 l 4 4 l 4 -4 l 9 16 z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
          {/* lava */}
          <path d="M -5 -6 l 4 4 l 4 -4" fill="none" stroke="#ff7a1a" strokeWidth={1.6} strokeLinecap="round" />
          <path d="M -3 -10 q 0 -4 3 -6 q 3 -2 2 -6" fill="none" stroke="#ffb347" strokeWidth={1.2} strokeLinecap="round" opacity={0.8} />
        </g>
      );
    case 'swamp':
      return (
        <g>
          {/* reeds */}
          <path d="M -8 10 l 0 -14 M -4 10 l 0 -16 M 8 10 l 0 -12" stroke={accent} strokeWidth={1.3} strokeLinecap="round" />
          <path d="M -8 -4 l -2 -3 M -4 -6 l 2 -3 M 8 -2 l 2 -3" stroke={accent} strokeWidth={1.1} strokeLinecap="round" />
          {/* bubbles */}
          <circle cx={2} cy={6} r={2} fill="none" stroke={stroke} strokeWidth={sw} />
          <circle cx={-2} cy={9} r={1.2} fill="none" stroke={stroke} strokeWidth={sw} />
          <circle cx={5} cy={10} r={1} fill="none" stroke={stroke} strokeWidth={sw} />
        </g>
      );
  }
}

function CompassRose({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`} opacity={0.85}>
      <circle r={34} fill="none" stroke="#3a2a1a" strokeWidth={1.2} />
      <circle r={28} fill="none" stroke="#3a2a1a" strokeWidth={0.6} strokeDasharray="2 3" />
      {/* 8-point star */}
      <path d="M 0 -30 L 4 -4 L 30 0 L 4 4 L 0 30 L -4 4 L -30 0 L -4 -4 Z" fill="#d4a968" stroke="#3a2a1a" strokeWidth={1} />
      <path d="M 0 -22 L 2.5 -2.5 L 22 0 L 2.5 2.5 L 0 22 L -2.5 2.5 L -22 0 L -2.5 -2.5 Z" fill="#f0d89a" stroke="#3a2a1a" strokeWidth={0.6} />
      <text y={-36} textAnchor="middle" fontSize={11} fontWeight={700} fill="#3a2a1a" fontFamily="Cinzel, Trajan, 'Times New Roman', serif">N</text>
      <text y={44} textAnchor="middle" fontSize={11} fontWeight={700} fill="#3a2a1a" fontFamily="Cinzel, Trajan, 'Times New Roman', serif">S</text>
      <text x={38} y={4} textAnchor="middle" fontSize={11} fontWeight={700} fill="#3a2a1a" fontFamily="Cinzel, Trajan, 'Times New Roman', serif">E</text>
      <text x={-38} y={4} textAnchor="middle" fontSize={11} fontWeight={700} fill="#3a2a1a" fontFamily="Cinzel, Trajan, 'Times New Roman', serif">W</text>
    </g>
  );
}

function CloudSwirl({ x, y, scale = 1 }: { x: number; y: number; scale?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={0.35}>
      <path d="M 0 0 q 10 -6 20 -2 q 8 3 14 0 q 6 -2 10 2" fill="none" stroke="#fff8e8" strokeWidth={2.2} strokeLinecap="round" />
      <path d="M 4 8 q 8 -4 16 -1 q 6 2 10 0" fill="none" stroke="#fff8e8" strokeWidth={1.6} strokeLinecap="round" />
    </g>
  );
}

export function WorldMap({ onClose }: Props) {
  const zonesVisited = useAchievementStore((s) => s.zonesVisited);
  const currentScene = (window as { __currentMap?: { sceneKey?: string } }).__currentMap?.sceneKey;

  const zoneByKey = Object.fromEntries(ZONES.map((z) => [z.key, z]));

  return (
    <div className="wmap" role="dialog" aria-label="World Map" onClick={onClose}>
      <div className="wmap__panel" onClick={(e) => e.stopPropagation()}>
        <div className="wmap__header">
          <span className="wmap__title">WORLD MAP</span>
          <button type="button" className="wmap__close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="wmap__svg-wrap">
          <svg
            className="wmap__svg"
            viewBox={`0 0 ${W} ${H}`}
            width={W}
            height={H}
            aria-hidden="true"
          >
            <defs>
              {/* parchment turbulence filter */}
              <filter id="wmap-parchment" x="0" y="0" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" />
                <feColorMatrix values="0 0 0 0 0.55  0 0 0 0 0.40  0 0 0 0 0.22  0 0 0 0.35 0" />
                <feComposite in2="SourceGraphic" operator="in" />
              </filter>
              <filter id="wmap-stains" x="0" y="0" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="3" />
                <feColorMatrix values="0 0 0 0 0.30  0 0 0 0 0.18  0 0 0 0 0.08  0 0 0 0.22 0" />
              </filter>
              <radialGradient id="wmap-vignette" cx="50%" cy="50%" r="70%">
                <stop offset="60%" stopColor="#000" stopOpacity="0" />
                <stop offset="100%" stopColor="#2a1808" stopOpacity="0.55" />
              </radialGradient>
              <linearGradient id="wmap-parch-base" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#f3dfae" />
                <stop offset="50%" stopColor="#e9caa0" />
                <stop offset="100%" stopColor="#d8b380" />
              </linearGradient>
            </defs>

            {/* Parchment background */}
            <rect x={0} y={0} width={W} height={H} fill="url(#wmap-parch-base)" />
            <rect x={0} y={0} width={W} height={H} fill="#000" filter="url(#wmap-stains)" opacity={0.6} />
            <rect x={0} y={0} width={W} height={H} fill="#000" filter="url(#wmap-parchment)" opacity={0.35} />
            <rect x={0} y={0} width={W} height={H} fill="url(#wmap-vignette)" />

            {/* Decorative border */}
            <rect x={6} y={6} width={W - 12} height={H - 12} fill="none" stroke="#6a4a22" strokeWidth={2} />
            <rect x={12} y={12} width={W - 24} height={H - 24} fill="none" stroke="#6a4a22" strokeWidth={0.6} strokeDasharray="2 4" />

            {/* Cloud/wind swirls in empty areas */}
            <CloudSwirl x={60} y={300} scale={1.2} />
            <CloudSwirl x={320} y={380} scale={0.9} />
            <CloudSwirl x={620} y={380} scale={1.1} />
            <CloudSwirl x={150} y={370} scale={0.8} />

            {/* Connections — dashed trail lines */}
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

            {/* Zones */}
            {ZONES.map((zone) => {
              const visited = zonesVisited.has(zone.key);
              const isCurrent = currentScene === zone.key;
              return (
                <g
                  key={zone.key}
                  className={visited ? 'wmap__node wmap__node--visited' : 'wmap__node wmap__node--hidden'}
                  transform={`translate(${zone.x} ${zone.y})`}
                >
                  {isCurrent && (
                    <circle r={22} className="wmap__pulse" fill="none" />
                  )}
                  <circle r={18} className={visited ? 'wmap__halo wmap__halo--visited' : 'wmap__halo wmap__halo--hidden'} />
                  <ZoneIcon type={zone.type} visited={visited} />
                  <text
                    y={32}
                    textAnchor="middle"
                    className={visited ? 'wmap__label wmap__label--visited' : 'wmap__label wmap__label--hidden'}
                  >
                    {visited ? zone.name : '???'}
                  </text>
                </g>
              );
            })}

            {/* Compass rose, top-right corner */}
            <CompassRose x={W - 60} y={60} />

            {/* Map title banner */}
            <g transform={`translate(${W / 2} 28)`}>
              <text textAnchor="middle" className="wmap__banner">Kingdom of Hollowcrown</text>
            </g>
          </svg>
        </div>

        <p className="wmap__hint">Discovered lands take form. The fog of the unknown conceals the rest.</p>
      </div>
    </div>
  );
}
