import { useEffect, useState } from 'react';
import { useQuestStore } from '../../state/questStore';
import './WaypointArrow.css';

// Map each quest objective to its target (scene key to reach, or
// 'same' if the target is in the current scene — then look up by position)
export const OBJECTIVE_TARGETS: Record<string, { scene: string; label: string }> = {
  'iron-token:talk-orric': { scene: 'GreenhollowScene', label: 'Orric' },
  'iron-token:find-cairn': { scene: 'MossbarrowScene', label: 'Cairn' },
  'depths-explorer:reach-floor-3': { scene: 'DepthsFloor3Scene', label: 'Depths F3' },
  'hollow-king-slayer:kill-hollow-king': { scene: 'DepthsFloor3Scene', label: 'Throne' },
  'scholars-trail:find-journal': { scene: 'AshenmereScene', label: 'Marshes' },
  'scholars-trail:return-journal': { scene: 'AshenmereScene', label: 'Hermit' },
  'drowned-sanctum:enter-sanctum': { scene: 'DrownedSanctumF1Scene', label: 'Sanctum' },
  'drowned-sanctum:find-veyrin': { scene: 'DrownedSanctumF2Scene', label: 'Veyrin' },
  'what-remains:return-to-brenna': { scene: 'TownScene', label: 'Brenna' },
  'the-final-gate:reach-coast': { scene: 'ShatteredCoastScene', label: 'Coast' },
  'the-crownless-one:reach-coast': { scene: 'ShatteredCoastScene', label: 'Coast' },
  'the-crownless-one:enter-throne-beneath': { scene: 'ThroneBeneathF1Scene', label: 'Descent' },
  'the-crownless-one:defeat-crownless': { scene: 'ThroneBeneathF3Scene', label: 'Throne' },
};

// Simple directional mapping from scene A → scene B
// (which direction to point when in scene A to head toward scene B)
const DIRECTION_MAP: Record<string, Record<string, 'n' | 's' | 'e' | 'w'>> = {
  TownScene: { GreenhollowScene: 's', MossbarrowScene: 's', AshenmereScene: 'e' },
  GreenhollowScene: { MossbarrowScene: 'e', TownScene: 'n', DuskmereScene: 's', AshenmereScene: 'e' },
  MossbarrowScene: { DepthsFloor3Scene: 's', DepthsFloor2Scene: 's', MossbarrowDepthsScene: 's', IronveilScene: 'e', GreenhollowScene: 'w' },
  AshenmereScene: { ShatteredCoastScene: 'e', AshfieldsScene: 'e', DrownedSanctumF1Scene: 's', DrownedSanctumF2Scene: 's', BogDungeonF1Scene: 's', TownScene: 'w' },
  AshfieldsScene: { ShatteredCoastScene: 'e', AshenTowerF1Scene: 's', AshenTowerF2Scene: 's', AshenTowerF3Scene: 's', AshenmereScene: 'w' },
  IronveilScene: { FrosthollowScene: 'n', MossbarrowScene: 'w' },
  FrosthollowScene: { FrozenHollowF1Scene: 's', FrozenHollowF2Scene: 's', FrozenHollowF3Scene: 's', IronveilScene: 's' },
  ShatteredCoastScene: { ThroneBeneathF1Scene: 's', ThroneBeneathF2Scene: 's', ThroneBeneathF3Scene: 's', AshfieldsScene: 'w' },
};

export function WaypointArrow() {
  const active = useQuestStore((s) => s.active);
  const [, force] = useState(0);

  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 500);
    return () => clearInterval(id);
  }, []);

  // Find first active main-quest objective with a target mapping
  const sceneKey = (window as { __currentMap?: { sceneKey?: string } }).__currentMap?.sceneKey;
  if (!sceneKey) return null;

  let target: { scene: string; label: string } | null = null;
  for (const state of Object.values(active)) {
    if (state.turnedIn || state.isComplete) continue;
    // Use first incomplete objective
    for (const oid of Object.keys(OBJECTIVE_TARGETS)) {
      const [qid, objId] = oid.split(':');
      if (state.questId !== qid) continue;
      if (state.completedObjectiveIds.includes(objId)) continue;
      target = OBJECTIVE_TARGETS[oid];
      break;
    }
    if (target) break;
  }

  if (!target) return null;

  // Already in target scene — hide (or show "here" indicator)
  if (sceneKey === target.scene) return null;

  const dir = DIRECTION_MAP[sceneKey]?.[target.scene];
  if (!dir) return null;

  // Position arrow at the matching edge
  const positions: Record<string, React.CSSProperties> = {
    n: { top: '12%', left: '50%', transform: 'translateX(-50%) rotate(-90deg)' },
    s: { bottom: '12%', left: '50%', transform: 'translateX(-50%) rotate(90deg)' },
    e: { right: '4%', top: '50%', transform: 'translateY(-50%)' },
    w: { left: '4%', top: '50%', transform: 'translateY(-50%) rotate(180deg)' },
  };

  return (
    <div className="waypoint" style={positions[dir]}>
      <div className="waypoint__arrow">▶</div>
      <div className="waypoint__label">{target.label}</div>
    </div>
  );
}
