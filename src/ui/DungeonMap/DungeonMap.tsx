import { useEffect, useState } from 'react';
import { useDungeonMapStore } from '../../state/dungeonMapStore';
import './DungeonMap.css';

const DUNGEON_SCENES = new Set([
  'MossbarrowDepthsScene', 'DepthsFloor2Scene', 'DepthsFloor3Scene',
  'BogDungeonF1Scene', 'BogDungeonF2Scene', 'BogDungeonF3Scene',
  'AshenTowerF1Scene', 'AshenTowerF2Scene', 'AshenTowerF3Scene',
  'FrozenHollowF1Scene', 'FrozenHollowF2Scene', 'FrozenHollowF3Scene',
  'DrownedSanctumF1Scene', 'DrownedSanctumF2Scene',
  'ThroneBeneathF1Scene', 'ThroneBeneathF2Scene', 'ThroneBeneathF3Scene',
  'ForgottenCaveScene', 'IronveilScene',
]);

const SCENE_NAMES: Record<string, string> = {
  MossbarrowDepthsScene: 'Spider Cavern',
  DepthsFloor2Scene: 'The Catacombs',
  DepthsFloor3Scene: 'The Hollow Throne',
  BogDungeonF1Scene: 'The Sunken Halls',
  BogDungeonF2Scene: 'The Drowned Gallery',
  BogDungeonF3Scene: "The Warden's Pool",
  AshenTowerF1Scene: 'The Burning Halls',
  AshenTowerF2Scene: 'The Ember Forge',
  AshenTowerF3Scene: 'The Mirror Chamber',
  FrozenHollowF1Scene: 'The Ice Caverns',
  FrozenHollowF2Scene: 'The Frost Vault',
  FrozenHollowF3Scene: 'The Heart of Winter',
  DrownedSanctumF1Scene: 'Drowned Sanctum — F1',
  DrownedSanctumF2Scene: 'The Sanctum Heart',
  ThroneBeneathF1Scene: 'The Descent',
  ThroneBeneathF2Scene: 'The Hall of Names',
  ThroneBeneathF3Scene: 'The Forgotten Throne',
  ForgottenCaveScene: 'The Forgotten',
  IronveilScene: 'Ironveil Mines',
};

interface Props { onClose: () => void; }

interface CurrentMap {
  sceneKey?: string;
  playerX?: number;
  playerY?: number;
}

declare global {
  interface Window { __currentMap?: CurrentMap; }
}

export function DungeonMap({ onClose }: Props) {
  const [currentScene, setCurrentScene] = useState<string>('');
  const [playerPos, setPlayerPos] = useState({ x: 0, y: 0 });
  const visited = useDungeonMapStore((s) => s.visited);

  useEffect(() => {
    const update = () => {
      const map = window.__currentMap;
      if (map) {
        setCurrentScene(map.sceneKey ?? '');
        setPlayerPos({
          x: Math.floor((map.playerX ?? 0) / 32),
          y: Math.floor((map.playerY ?? 0) / 32),
        });
      }
    };
    update();
    const interval = setInterval(update, 200);
    return () => clearInterval(interval);
  }, []);

  if (!DUNGEON_SCENES.has(currentScene)) {
    return (
      <div className="dungeon-map" onClick={onClose}>
        <div className="dungeon-map__panel" onClick={(e) => e.stopPropagation()}>
          <h2>No Map Available</h2>
          <p>Maps are only found inside dungeons and mines.</p>
          <button className="dungeon-map__close" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  }

  const visitedTiles = visited[currentScene] ?? new Set<string>();
  const MAP_W = 30;
  const MAP_H = 22;
  const CELL = 14;

  return (
    <div className="dungeon-map" onClick={onClose}>
      <div className="dungeon-map__panel" onClick={(e) => e.stopPropagation()}>
        <h2>Dungeon Map</h2>
        <p className="dungeon-map__subtitle">{SCENE_NAMES[currentScene] ?? currentScene.replace('Scene', '')}</p>
        <div className="dungeon-map__grid" style={{ width: MAP_W * CELL, height: MAP_H * CELL }}>
          {Array.from({ length: MAP_H }, (_, y) =>
            Array.from({ length: MAP_W }, (_, x) => {
              const key = `${x},${y}`;
              const isVisited = visitedTiles.has(key);
              const isPlayer = x === playerPos.x && y === playerPos.y;
              if (!isVisited && !isPlayer) return null;
              return (
                <div
                  key={key}
                  className={`dungeon-map__cell ${isVisited ? 'is-visited' : ''} ${isPlayer ? 'is-player' : ''}`}
                  style={{ left: x * CELL, top: y * CELL, width: CELL, height: CELL }}
                />
              );
            })
          )}
        </div>
        <p className="dungeon-map__legend">
          <span className="dungeon-map__dot is-visited" /> Explored
          <span className="dungeon-map__dot is-player" /> You are here
        </p>
        <button className="dungeon-map__close" onClick={onClose}>Close (Esc)</button>
      </div>
    </div>
  );
}
