import * as Phaser from 'phaser';
import { usePlayerStore } from '../state/playerStore';
import { useLoreStore } from '../state/loreStore';
import { useDialogueStore } from '../state/dialogueStore';
import { useCombatStore } from '../state/combatStore';
import { useInventoryStore } from '../state/inventoryStore';
import { useAchievementStore } from '../state/achievementStore';
import { getDialogue } from '../engine/dialogues';
import { getItem } from '../engine/items';
import { getNPC } from '../engine/npcs';
import { saveGame } from '../engine/saveLoad';
import { useCommissionStore } from '../state/commissionStore';
import { useDungeonItemStore } from '../state/dungeonItemStore';
import { useWorldStateStore } from '../state/worldStateStore';
import { getMonster } from '../engine/monster';
import { useDungeonMapStore } from '../state/dungeonMapStore';
import { useTimeStore, getPhaseTint } from '../state/timeStore';
import { useGameStatsStore } from '../state/gameStatsStore';
import { spawnWeather, getWeatherForScene } from './weather';
import { applyTileVariants } from './tiles/tileMap';
import { Pseudo3d, USE_PSEUDO_3D } from './pseudo3d';
import {
  generateCharacterSprite,
  getNpcPalette,
  getNpcEquip,
  getNpcRace,
  getNpcGender,
  playerPalette,
  SPRITE_W,
  SPRITE_H,
} from './sprites/generateSprites';
import { generateMonsterSprite } from './sprites/generateMonsters';
import { Sfx } from '../engine/audio';

/** Pick a footstep SFX based on the current scene key. */
function playFootstepForScene(sceneKey: string): void {
  const k = sceneKey.toLowerCase();
  if (k.includes('drownedsanctum') || k.includes('shatteredcoast') || k.includes('bog')) {
    Sfx.footstepWater();
  } else if (k.includes('ashenvale') || k.includes('duskmere') || k.includes('greenhollow') ||
             k.includes('mossbarrow') || k.includes('ashfields') || k.includes('frosthollow') ||
             k.includes('ashenmere') || k.includes('ironveil')) {
    Sfx.footstepGrass();
  } else if (k.includes('interior')) {
    Sfx.footstepWood();
  } else {
    // Town + all dungeons (throne, ashen tower, frozen hollow, cave, depths) = stone.
    Sfx.footstepStone();
  }
}

/**
 * Shared world-scene infrastructure. Handles player creation & movement,
 * NPC spawning & proximity prompts, dialogue integration, world bounds,
 * and edge-triggered zone transitions with a camera fade.
 *
 * Concrete scenes (TownScene, GreenhollowScene) extend this and only
 * implement {@link layout} (paint the map + call helpers) and
 * {@link spawnAt} (resolve a named spawn point to coordinates).
 */

export interface WorldSceneInit {
  /** Named spawn point the target scene should resolve via spawnAt(). */
  spawnPoint?: string;
}

interface NpcSprite {
  key: string;
  name: string;
  dialogueId: string;
  sprite: Phaser.GameObjects.Arc | Phaser.GameObjects.Sprite;
  nameLabel: Phaser.GameObjects.Text;
}

interface Interactable {
  sprite: Phaser.GameObjects.GameObject & { x: number; y: number };
  label: string;
  action: () => void;
  radius: number;
}

/** What the player is standing near and could press E on. */
type NearbyTarget =
  | { kind: 'npc'; ref: NpcSprite; label: string; x: number; y: number; radius: number }
  | { kind: 'interactable'; ref: Interactable; label: string; x: number; y: number; radius: number };

interface Exit {
  /** Trigger rectangle (physical bounds for overlap check). */
  x: number;
  y: number;
  w: number;
  h: number;
  /** Visible marker centered on the exit (can be null if invisible). */
  marker: Phaser.GameObjects.Text | null;
  targetScene: string;
  targetSpawn: string;
}

export const TILE = 32;
export const WORLD_W = 1280;
export const WORLD_H = 720;

const _PLAYER_RADIUS = 14; void _PLAYER_RADIUS; // kept for reference
const NPC_RADIUS = 14; void NPC_RADIUS;
const PLAYER_SPEED = 190;
const INTERACT_RADIUS = 56;
const FADE_MS = 250;

/** Screen shake scaled by the user's `hc_shake` preference (0..1+). */
export function shakeScaled(
  scene: Phaser.Scene,
  duration: number,
  intensity: number,
): void {
  const mult = (window as any).__shakeIntensity ?? 1;
  if (mult <= 0) return;
  scene.cameras.main.shake(duration, intensity * mult);
}

export abstract class BaseWorldScene extends Phaser.Scene {
  protected player!: Phaser.GameObjects.Sprite;
  protected playerNameLabel!: Phaser.GameObjects.Text;
  private playerFacing = 0; // 0=down, 1=up, 2=left, 3=right
  private lastFootstepAt = 0;
  protected cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  protected keyW!: Phaser.Input.Keyboard.Key;
  protected keyA!: Phaser.Input.Keyboard.Key;
  protected keyS!: Phaser.Input.Keyboard.Key;
  protected keyD!: Phaser.Input.Keyboard.Key;
  protected keyE!: Phaser.Input.Keyboard.Key;

  protected walls!: Phaser.Physics.Arcade.StaticGroup;
  protected npcs: NpcSprite[] = [];
  protected interactables: Interactable[] = [];
  protected traps: Array<{ x: number; y: number; damage: number; cooldown: number }> = [];
  protected pushBlocks: Array<{
    sprite: Phaser.GameObjects.Rectangle;
    diamond: Phaser.GameObjects.Rectangle;
    tileX: number;
    tileY: number;
  }> = [];
  protected pressurePlates: Array<{
    tileX: number; tileY: number;
    sprite: Phaser.GameObjects.Rectangle;
    activated: boolean;
    onActivate: () => void;
  }> = [];
  protected enemies: Array<{
    sprite: Phaser.GameObjects.Arc | Phaser.GameObjects.Sprite;
    monsterKey: string;
    id: string;
    baseX: number;
    baseY: number;
    patrolDir: number;
    patrolTimer: number;
  }> = [];
  protected exits: Exit[] = [];
  protected prompt!: Phaser.GameObjects.Text;
  protected nearbyTarget: NearbyTarget | null = null;

  /** Pseudo-3D depth / shadow / ambient helper. Enabled by USE_PSEUDO_3D. */
  protected pseudo3d: Pseudo3d | null = null;

  /** Guards against re-entering checkExits during a transition. */
  private transitionLock = false;

  // ── World event system ──
  private worldEventTimer = 0;
  private readonly worldEventCooldown = 30000; // 30 s between checks
  /** Brief immunity after returning from combat — prevents instant re-engage on flee. */
  private combatImmunity = 0;
  /** Exit zone the player spawned inside — suppressed until they walk out of it. */
  private suppressedExit: Exit | null = null;

  // ── Dark room / Lantern light system ──
  private darkRT: Phaser.GameObjects.RenderTexture | null = null;
  private darkBrush: Phaser.GameObjects.Graphics | null = null;
  private torchBrush: Phaser.GameObjects.Graphics | null = null;
  private isDarkRoom = false;
  private lanternGlow: Phaser.GameObjects.Graphics | null = null;
  private lanternFlickerPhase = 0;
  private shadeFleeTimers = new Map<string, number>();
  private shadeDamageAccum = new Map<string, number>();

  // ── Torch interactables ──
  protected torches: Array<{
    id: string;
    x: number;
    y: number;
    lit: boolean;
    base: Phaser.GameObjects.GameObject;
    flame: Phaser.GameObjects.Arc | null;
    glow: Phaser.GameObjects.Arc | null;
  }> = [];
  /** Optional "light all torches" puzzle. Fires onComplete once. */
  protected torchPuzzle: { ids: string[]; completed: boolean; onComplete: () => void } | null = null;


  // ── Water Charm system ──
  /** Shallow water zones in this scene. Player passes through only with
   *  the Water Charm; movement is slowed and ripples follow. Enemies are
   *  always blocked by the zone's collider. */
  protected shallowWaterZones: Array<{
    x: number; y: number; w: number; h: number;
    /** Static body that blocks enemies AND the player when the Water
     *  Charm is not equipped. Disabled when the player walks in with the
     *  charm equipped, re-enabled when they leave. */
    barrier: Phaser.GameObjects.Rectangle;
  }> = [];
  private lastWaterRippleAt = 0;
  private lastWaterStepAt = 0;
  /** Whether the player was in shallow water last frame (edge detection). */
  private wasInShallowWater = false;
  /** Scene-wide underwater config (applied via setUnderwater from layout). */
  private isUnderwater = false;

  // ── Echo Stone system ──
  /** Hollow walls in this scene — revealed (glow cyan) when the Echo pulse touches them. */
  protected hollowWalls: Array<{
    sprite: Phaser.GameObjects.Rectangle;
    cx: number;
    cy: number;
    broken: boolean;
    reveal: () => void;
  }> = [];
  /** Invisible enemy overlays tracked per-enemy so we can flash them. */
  protected invisibleEnemies: Array<{
    sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Arc;
    outline: Phaser.GameObjects.Arc;
    revealedUntil: number;
  }> = [];
  private echoBoundHandler: ((e: Event) => void) | null = null;

  // ── Stuck watchdog ──
  /** ms timestamp of last WASD/arrow keydown — used by the lock watchdog
   *  to detect "user trying to move but nothing's happening". */
  private lastMovementInputAt = 0;
  /** ms timestamp of the last frame the player actually moved. */
  private lastPlayerMoveAt = 0;
  /** "Press Esc to unstick" hint text shown when the player has been
   *  idle + locked for 3+ seconds. */
  private stuckHintText: Phaser.GameObjects.Text | null = null;

  // ──────────────────────────────────────────────────────────────
  // Subclass hooks
  // ──────────────────────────────────────────────────────────────

  /** Paint ground, buildings/trees, spawn NPCs, register exits. */
  protected abstract layout(): void;

  /**
   * Resolve a named spawn point (e.g. "default", "fromGreenhollow").
   *
   * Subclasses override this; the base provides a safe center-of-world
   * fallback so an unknown spawn name cannot produce NaN coordinates
   * (previously reachable via fast-travel when a scene hadn't registered
   * the requested spawn — the player would teleport to NaN, NaN and freeze).
   */
  protected spawnAt(_name: string): { x: number; y: number } {
    return { x: WORLD_W / 2, y: WORLD_H / 2 };
  }

  /** Override in subclasses to return the zone's display name. Return null to skip the indicator. */
  protected getZoneName(): string | null { return null; }

  /** Override in outdoor zones to supply random events that can fire while walking. */
  protected getRandomEvents(): Array<() => void> { return []; }

  // ──────────────────────────────────────────────────────────────
  // Phaser lifecycle
  // ──────────────────────────────────────────────────────────────

  create(data?: WorldSceneInit & { combatReturnX?: number; combatReturnY?: number }): void {
    this.npcs = [];
    this.interactables = [];
    this.enemies = [];
    this.exits = [];
    this.traps = [];
    this.pushBlocks = [];
    this.pressurePlates = [];
    this.hollowWalls = [];
    this.invisibleEnemies = [];
    this.shallowWaterZones = [];
    this.lastWaterRippleAt = 0;
    this.lastWaterStepAt = 0;
    this.wasInShallowWater = false;
    this.isUnderwater = false;
    this.nearbyTarget = null;
    this.transitionLock = false;
    this.combatImmunity = 0;
    this.suppressedExit = null;

    this.walls = this.physics.add.staticGroup();
    this.createWorldBounds();

    // Pseudo-3D helper — one per scene, initialized before layout() so
    // subclasses can register shadows/Y-sort on objects they create.
    if (USE_PSEUDO_3D) {
      this.pseudo3d = new Pseudo3d(this);
    }

    this.layout();

    // Per-cell variant cycling — after layout() has created any tilemap
    // layers, hash (tileId, x, y) to swap grass/path/stone cells for
    // one of their variant tiles. Makes fields read as hand-placed.
    // Stable & deterministic so collision-relevant indices never change
    // unexpectedly across reloads (grass/path aren't solid; all variants
    // of a biome stay in the same logical class).
    this.children.each((obj) => {
      const layer = obj as Phaser.Tilemaps.TilemapLayer;
      if (layer && typeof (layer as unknown as { forEachTile?: unknown }).forEachTile === 'function') {
        applyTileVariants(layer as unknown as Parameters<typeof applyTileVariants>[0]);
      }
      return null;
    });

    // If returning from combat, use the saved position instead of a named spawn.
    let spawn: { x: number; y: number };
    if (data?.spawnPoint === 'combat_return' && data.combatReturnX && data.combatReturnY) {
      // Fled/returned-from-combat safety: the enemy respawns at its base
      // position (with jitter), and the player's saved return position is
      // right next to it — a plain setPosition would let the contact check
      // re-trigger combat the moment immunity runs out. So we both (a) push
      // the player ~2 tiles away from the nearest enemy spawn and (b) hold
      // a longer immunity window than before.
      const savedX = data.combatReturnX;
      const savedY = data.combatReturnY;
      // Find the closest upcoming enemy spawn so we can shove the player
      // away from it. layout() has already populated this.enemies above.
      let nearest: { x: number; y: number; d2: number } | null = null;
      for (const enemy of this.enemies) {
        const dx = savedX - enemy.baseX;
        const dy = savedY - enemy.baseY;
        const d2 = dx * dx + dy * dy;
        if (!nearest || d2 < nearest.d2) {
          nearest = { x: enemy.baseX, y: enemy.baseY, d2 };
        }
      }
      if (nearest && nearest.d2 < (TILE * 3) * (TILE * 3)) {
        const dx = savedX - nearest.x;
        const dy = savedY - nearest.y;
        const len = Math.max(1, Math.hypot(dx, dy));
        const push = TILE * 2;
        spawn = { x: savedX + (dx / len) * push, y: savedY + (dy / len) * push };
      } else {
        // No nearby enemy (e.g. boss kill — boss no longer respawns). Nudge
        // the player up one tile so they don't spawn directly on top of any
        // post-victory loot chests or decor placed at the former enemy spot.
        // Previously this case left the player pinned to savedY exactly,
        // which in the Hollow Throne caused the "stuck and glitched" bug
        // — the player body landed inside the throne-adjacent chest
        // interact radius right as a fullscreen LevelUpPopup covered the
        // screen.
        spawn = { x: savedX, y: Math.max(TILE, savedY - TILE) };
      }
      // Clamp to world bounds (stay a tile away from the edge walls).
      spawn.x = Math.max(TILE, Math.min(WORLD_W - TILE, spawn.x));
      spawn.y = Math.max(TILE, Math.min(WORLD_H - TILE, spawn.y));
      // Grant immunity so the player isn't instantly re-engaged while the
      // fade-in plays. 2000 ms gives them time to react; ticks down in
      // update().
      this.combatImmunity = 2000; // ms
    } else {
      spawn = this.spawnAt(data?.spawnPoint ?? 'default');
      // Guard against a subclass returning NaN/undefined from spawnAt.
      // Previously reachable via fast-travel to a scene that didn't
      // register the requested spawn name — player froze at NaN coords.
      if (!Number.isFinite(spawn?.x) || !Number.isFinite(spawn?.y)) {
        // eslint-disable-next-line no-console
        console.warn(
          `[${this.scene.key}] spawnAt('${data?.spawnPoint ?? 'default'}') returned invalid coords`,
          spawn,
          '— falling back to world center',
        );
        spawn = { x: WORLD_W / 2, y: WORLD_H / 2 };
      }
    }
    this.createPlayer(spawn.x, spawn.y);

    // Suppress the exit zone the player spawned inside (prevents instant
    // re-triggering when arriving from stairs — e.g. going DOWN on Floor 1
    // spawns you at the top of Floor 2, right inside the stairs-UP zone).
    for (const exit of this.exits) {
      if (spawn.x >= exit.x && spawn.x <= exit.x + exit.w &&
          spawn.y >= exit.y && spawn.y <= exit.y + exit.h) {
        this.suppressedExit = exit;
        break;
      }
    }

    this.setupInput();
    this.createPrompt();
    this.setupInteractionFailsafes();

    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    if (this.player) this.cameras.main.startFollow(this.player, true, 0.15, 0.15);
    this.cameras.main.fadeIn(FADE_MS, 0, 0, 0);

    // Pseudo-3D ambient: subtle vignette always, plus warm/cool tint
    // based on time of day. Dark dungeons already have their own
    // darkness overlay from the lantern system — skip the tint there.
    if (this.pseudo3d) {
      this.pseudo3d.addAmbientVignette(0x0a0605, 0.28);
      if (!this.isDarkRoom) {
        const phase = useTimeStore.getState().phase;
        if (phase === 'dawn') this.pseudo3d.addAmbientTint(0xffc880, 0.12);
        else if (phase === 'dusk') this.pseudo3d.addAmbientTint(0xe0826a, 0.14);
        else if (phase === 'night') this.pseudo3d.addAmbientTint(0x2a3868, 0.18);
      }
    }

    // Weather — zone-specific ambient particles
    const weatherKind = getWeatherForScene(this.scene.key);
    const stopWeather = spawnWeather(this, weatherKind, WORLD_W, WORLD_H);
    // Clean up on scene shutdown
    this.events.once('shutdown', stopWeather);
    this.events.once('destroy', stopWeather);

    // Pseudo-3D cleanup
    if (this.pseudo3d) {
      const p = this.pseudo3d;
      this.events.once('shutdown', () => { p.destroy(); });
      this.events.once('destroy', () => { p.destroy(); });
    }

    // Echo Stone pulse handler — draws an expanding cyan ring, reveals
    // nearby hollow walls, and flashes any invisible enemies.
    this.echoBoundHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { x?: number; y?: number } | undefined;
      const px = detail?.x ?? this.player?.x ?? 0;
      const py = detail?.y ?? this.player?.y ?? 0;
      this.fireEchoPulse(px, py);
    };
    window.addEventListener('echoStonePulse', this.echoBoundHandler);
    const echoCleanup = () => {
      if (this.echoBoundHandler) {
        window.removeEventListener('echoStonePulse', this.echoBoundHandler);
        this.echoBoundHandler = null;
      }
    };
    this.events.once('shutdown', echoCleanup);
    this.events.once('destroy', echoCleanup);

    // Dark room — in dark scenes, a near-opaque overlay blankets the map.
    // The lantern (if lit) and any lit torches punch holes of light through it.
    // In non-dark scenes, only the lantern glow graphic is drawn.
    if (this.isDarkRoom) {
      this.darkRT = this.add.renderTexture(0, 0, WORLD_W, WORLD_H).setDepth(100);
      // Large brush for the lantern circle (radius ~180px, sized generously
      // for the radial falloff we draw manually).
      this.darkBrush = this.make.graphics({});
      this.darkBrush.fillStyle(0xffffff);
      this.darkBrush.fillCircle(180, 180, 180);
      // Smaller brush for lit torches (~80px radius).
      this.torchBrush = this.make.graphics({});
      this.torchBrush.fillStyle(0xffffff);
      this.torchBrush.fillCircle(100, 100, 100);
    }
    // Lantern glow — always present as a graphic; hidden when lantern not lit.
    this.lanternGlow = this.add.graphics();
    this.lanternGlow.setDepth(95);
    this.lanternGlow.setVisible(false);

    // Record zone visit for achievements.
    useAchievementStore.getState().recordZoneVisit(this.scene.key);

    // Dungeon checkpoint — auto-save the floor as a respawn point on death.
    if (isDungeonScene(this.scene.key)) {
      useCombatStore.getState().dungeonCheckpoint = { sceneKey: this.scene.key, spawn: 'default' };
    }

    // Expose map data for the React minimap overlay.
    (window as any).__currentMap = {
      sceneKey: this.scene.key,
      zoneName: this.getZoneName(),
      playerX: spawn.x,
      playerY: spawn.y,
      worldW: WORLD_W,
      worldH: WORLD_H,
      exits: this.exits.map((e) => ({ x: e.x + e.w / 2, y: e.y + e.h / 2 })),
      enemies: this.enemies.map((e) => ({ x: e.sprite.x, y: e.sprite.y })),
    };

    // Day/night tint overlay — outdoor zones only
    const OUTDOOR_SCENES = new Set([
      'TownScene', 'GreenhollowScene', 'MossbarrowScene', 'IronveilScene',
      'DuskmereScene', 'AshenmereScene', 'AshfieldsScene', 'FrosthollowScene',
      'ShatteredCoastScene',
    ]);
    if (OUTDOOR_SCENES.has(this.scene.key)) {
      const tint = getPhaseTint(useTimeStore.getState().phase);
      if (tint) {
        this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, tint.color, tint.alpha)
          .setDepth(99);
      }
    }

    // Zone name reveal handled by the P5 Impact banner during scene
    // transitions (see transition() below) — the plain centered text that
    // used to live here was redundant, so it has been removed.
  }

  update(): void {
    if (this.transitionLock) {
      // Freeze movement while fading out.
      const body = this.player?.body as Phaser.Physics.Arcade.Body | undefined;
      body?.setVelocity(0, 0);
      return;
    }
    if (useDialogueStore.getState().dialogue || useCombatStore.getState().state) {
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      this.prompt.setVisible(false);
      this.nearbyTarget = null;
      return;
    }

    // Tick down combat immunity (prevents instant re-engage after flee).
    if (this.combatImmunity > 0) {
      this.combatImmunity -= this.game.loop.delta;
    }

    this.handleMovement();
    // Water Charm — slow the player, spawn ripples, toggle wade barriers.
    // Runs after handleMovement so velocity scaling applies to this frame.
    this.updateShallowWater();
    // Keep minimap player position current.
    if ((window as any).__currentMap) {
      (window as any).__currentMap.playerX = this.player.x;
      (window as any).__currentMap.playerY = this.player.y;
      (window as any).__currentMap.enemies = this.enemies.map((e) => ({ x: e.sprite.x, y: e.sprite.y }));
    }
    // Track visited tiles for the dungeon map (3x3 area around player = vision radius).
    const tx = Math.floor(this.player.x / TILE);
    const ty = Math.floor(this.player.y / TILE);
    const mapStore = useDungeonMapStore.getState();
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        mapStore.visit(this.scene.key, tx + dx, ty + dy);
      }
    }
    this.checkTraps();
    this.updateInvisibleEnemies();
    this.updatePlayerLabel();
    this.updateProximityPrompt();
    this.handleInteraction();
    this.updateEnemyPatrol();
    if (this.combatImmunity <= 0) this.checkEnemyContact();
    this.checkExits();
    this.checkWorldEvents();

    this.updateLantern();
    // Pseudo-3D: follow shadows, apply Y-sort depth
    if (this.pseudo3d) this.pseudo3d.update(this.time.now);
  }

  // ──────────────────────────────────────────────────────────────
  // Helpers available to subclasses
  // ──────────────────────────────────────────────────────────────

  /** Draw a static colored rectangle that blocks the player. */
  protected addWall(x: number, y: number, w: number, h: number, color: number, stroke = 0x2a1810): Phaser.GameObjects.Rectangle {
    const rect = this.add.rectangle(x + w / 2, y + h / 2, w, h, color);
    rect.setStrokeStyle(2, stroke);
    this.physics.add.existing(rect, true);
    this.walls.add(rect);
    return rect;
  }

  /** Invisible thin wall segment — used to build hollow rooms. */
  protected addWallSegment(x: number, y: number, w: number, h: number): void {
    const wall = this.add.rectangle(x + w / 2, y + h / 2, w, h, 0x000000, 0);
    this.physics.add.existing(wall, true);
    this.walls.add(wall);
  }

  /**
   * Add a building as a *hollow room*: a visual colored body, plus four
   * explicit wall segments. Optionally leaves a gap for a door on one
   * side. Returns the door's outside-facing coordinate so callers can
   * place NPCs next to it.
   *
   * The small-segment approach is intentional — Phaser's arcade
   * collision is more reliable with multiple thin static bodies than
   * one large one, especially when the player brushes past NPCs.
   */
  protected addBuilding(cfg: {
    /** Top-left corner in tile coords. */
    xTile: number;
    yTile: number;
    wTile: number;
    hTile: number;
    color: number;
    label: string;
    /** When false, skip visual rectangles — useful when a tilemap
     *  provides the visuals and only collision segments are needed. */
    visual?: boolean;
    /** Side the door is on; defaults to 'bottom'. */
    doorSide?: 'bottom' | 'top' | 'left' | 'right';
    /** Door position along the side in tiles from the building's top-left
     *  corner along that axis. Defaults to centered. */
    doorOffsetTile?: number;
    /** Door gap width in tiles; default 1. */
    doorWidthTile?: number;
  }): { doorOutside: { x: number; y: number } } {
    const px = cfg.xTile * TILE;
    const py = cfg.yTile * TILE;
    const pw = cfg.wTile * TILE;
    const ph = cfg.hTile * TILE;
    const wt = 6; // wall thickness in px
    const doorW = (cfg.doorWidthTile ?? 1) * TILE;
    const side = cfg.doorSide ?? 'bottom';
    const drawVisual = cfg.visual !== false;

    if (drawVisual) {
      // Visual body (no physics — walls provide collision).
      this.add
        .rectangle(px + pw / 2, py + ph / 2, pw, ph, cfg.color)
        .setStrokeStyle(2, 0x2a1810);
    }

    // Label above the building (always drawn — even with tilemap visuals).
    this.add
      .text(px + pw / 2, py - 10, cfg.label, {
        fontFamily: 'Courier New',
        fontSize: '13px',
        color: '#8a7a48',
      })
      .setOrigin(0.5, 1);

    // Helpers for placing wall segments with a door gap.
    const axisCenter = (len: number, doorOff: number | undefined) =>
      doorOff !== undefined ? doorOff * TILE : (len - doorW) / 2;

    let doorOutsideX = px + pw / 2;
    let doorOutsideY = py + ph;

    if (side === 'bottom') {
      const offset = axisCenter(pw, cfg.doorOffsetTile);
      const doorLeft = px + offset;
      const doorRight = doorLeft + doorW;
      // top / left / right (full length)
      this.addWallSegment(px, py, pw, wt);
      this.addWallSegment(px, py, wt, ph);
      this.addWallSegment(px + pw - wt, py, wt, ph);
      // bottom split around the door
      if (doorLeft > px) this.addWallSegment(px, py + ph - wt, doorLeft - px, wt);
      if (doorRight < px + pw) {
        this.addWallSegment(doorRight, py + ph - wt, px + pw - doorRight, wt);
      }
      if (drawVisual) {
        // door threshold — dark sliver where the wall breaks
        this.add.rectangle(doorLeft + doorW / 2, py + ph - wt / 2, doorW, wt, 0x1a0e08);
      }
      doorOutsideX = doorLeft + doorW / 2;
      doorOutsideY = py + ph + TILE; // one tile below the wall
    } else if (side === 'top') {
      const offset = axisCenter(pw, cfg.doorOffsetTile);
      const doorLeft = px + offset;
      const doorRight = doorLeft + doorW;
      this.addWallSegment(px, py + ph - wt, pw, wt); // bottom
      this.addWallSegment(px, py, wt, ph); // left
      this.addWallSegment(px + pw - wt, py, wt, ph); // right
      if (doorLeft > px) this.addWallSegment(px, py, doorLeft - px, wt);
      if (doorRight < px + pw) this.addWallSegment(doorRight, py, px + pw - doorRight, wt);
      this.add.rectangle(doorLeft + doorW / 2, py + wt / 2, doorW, wt, 0x1a0e08);
      doorOutsideX = doorLeft + doorW / 2;
      doorOutsideY = py - TILE;
    } else if (side === 'left') {
      const offset = axisCenter(ph, cfg.doorOffsetTile);
      const doorTop = py + offset;
      const doorBottom = doorTop + doorW;
      this.addWallSegment(px, py, pw, wt); // top
      this.addWallSegment(px, py + ph - wt, pw, wt); // bottom
      this.addWallSegment(px + pw - wt, py, wt, ph); // right
      if (doorTop > py) this.addWallSegment(px, py, wt, doorTop - py);
      if (doorBottom < py + ph) this.addWallSegment(px, doorBottom, wt, py + ph - doorBottom);
      this.add.rectangle(px + wt / 2, doorTop + doorW / 2, wt, doorW, 0x1a0e08);
      doorOutsideX = px - TILE;
      doorOutsideY = doorTop + doorW / 2;
    } else if (side === 'right') {
      const offset = axisCenter(ph, cfg.doorOffsetTile);
      const doorTop = py + offset;
      const doorBottom = doorTop + doorW;
      this.addWallSegment(px, py, pw, wt);
      this.addWallSegment(px, py + ph - wt, pw, wt);
      this.addWallSegment(px, py, wt, ph);
      if (doorTop > py) this.addWallSegment(px + pw - wt, py, wt, doorTop - py);
      if (doorBottom < py + ph)
        this.addWallSegment(px + pw - wt, doorBottom, wt, py + ph - doorBottom);
      this.add.rectangle(px + pw - wt / 2, doorTop + doorW / 2, wt, doorW, 0x1a0e08);
      doorOutsideX = px + pw + TILE;
      doorOutsideY = doorTop + doorW / 2;
    }

    return { doorOutside: { x: doorOutsideX, y: doorOutsideY } };
  }

  /**
   * Spawn a non-NPC interactable the player can `E`-press. Used for
   * environment objects — cairns, chests, signs, levers. The sprite
   * is passed in so callers control its look.
   */
  protected spawnInteractable(cfg: {
    sprite: Phaser.GameObjects.GameObject & { x: number; y: number };
    label: string;
    radius?: number;
    action: () => void;
  }): void {
    this.interactables.push({
      sprite: cfg.sprite,
      label: cfg.label,
      radius: cfg.radius ?? 24,
      action: cfg.action,
    });
  }

  /**
   * Spawn a loot bag — a small sack the player can pick up with E.
   * Gives a random item from the provided loot table. One-time per visit
   * (the sprite is destroyed on pickup). Each bag has a % chance to
   * actually appear (default 50%), so they feel rare but rewarding.
   */
  protected spawnLootBag(cfg: {
    x: number;
    y: number;
    /** Array of { itemKey, weight } — higher weight = more likely. */
    loot: Array<{ itemKey: string; weight: number }>;
    /** Chance this bag spawns at all (0-1, default 0.5). */
    spawnChance?: number;
    /** Optional gold amount included. */
    gold?: number;
  }): void {
    // Persistent one-time pickup — if already looted this save, never
    // respawn (prevents the combat_return / zone-return farm exploit).
    const objectId = `lootbag_${Math.round(cfg.x)}_${Math.round(cfg.y)}`;
    if (useWorldStateStore.getState().isPicked(this.scene.key, objectId)) return;

    if (Math.random() > (cfg.spawnChance ?? 0.5)) return; // bag didn't spawn this visit

    // Draw the bag: small brown sack with a tie
    const bag = this.add.circle(cfg.x, cfg.y, 7, 0xa08040);
    bag.setStrokeStyle(2, 0x705020);
    bag.setDepth(8);
    // Tie/knot on top
    const tie = this.add.circle(cfg.x, cfg.y - 6, 3, 0xc0a050);
    tie.setDepth(8);

    this.spawnInteractable({
      sprite: bag as any,
      label: 'Open loot bag',
      radius: 22,
      action: () => {
        // Pick a random item based on weights
        const totalWeight = cfg.loot.reduce((s, l) => s + l.weight, 0);
        let roll = Math.random() * totalWeight;
        let picked = cfg.loot[0].itemKey;
        for (const entry of cfg.loot) {
          roll -= entry.weight;
          if (roll <= 0) { picked = entry.itemKey; break; }
        }

        const inv = useInventoryStore.getState();
        inv.addItem(picked);
        const itemName = getItem(picked).name;

        let msg = `Found ${itemName}!`;
        if (cfg.gold && cfg.gold > 0) {
          const char = usePlayerStore.getState().character;
          if (char) {
            char.addGold(cfg.gold);
            usePlayerStore.getState().notify();
          }
          msg += ` +${cfg.gold}g`;
        }
        this.spawnPickupParticles(cfg.x, cfg.y, 0xf4d488);
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: msg }));
        useWorldStateStore.getState().markPicked(this.scene.key, objectId);
        bag.destroy();
        tie.destroy();
      },
    });
  }

  /**
   * Spawn a small radial particle burst at (x, y) — used for item pickups.
   * color: 0xf4d488 = gold, 0x60c060 = materials, 0xffffff = items/chests.
   */
  protected spawnPickupParticles(x: number, y: number, color: number = 0xf4d488): void {
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const p = this.add.circle(x, y, 2, color).setDepth(30);
      this.tweens.add({
        targets: p,
        x: x + Math.cos(angle) * 20,
        y: y + Math.sin(angle) * 20 - 10,
        alpha: 0,
        duration: 400 + i * 50,
        onComplete: () => p.destroy(),
      });
    }
  }

  /**
   * Spawn a hidden fairy fountain -- a glowing pool that fully restores
   * HP and MP on interaction. One use per save file (persists across
   * combat_return and zone re-entry; previously respawned every fight,
   * giving infinite free heals).
   */
  protected spawnFairyFountain(cfg: { x: number; y: number }): void {
    const objectId = `fountain_${Math.round(cfg.x)}_${Math.round(cfg.y)}`;
    if (useWorldStateStore.getState().isPicked(this.scene.key, objectId)) return;

    // Outer glow
    const glow = this.add.circle(cfg.x, cfg.y, 24, 0x80c0f0, 0.15);
    glow.setDepth(5);
    this.tweens.add({ targets: glow, scale: 1.3, alpha: 0.08, duration: 2000, yoyo: true, repeat: -1 });

    // Inner pool
    const pool = this.add.circle(cfg.x, cfg.y, 14, 0xa0d0ff, 0.4);
    pool.setDepth(6);

    // Sparkle particles
    for (let i = 0; i < 4; i++) {
      const spark = this.add.circle(
        cfg.x + Phaser.Math.Between(-12, 12),
        cfg.y + Phaser.Math.Between(-12, 12),
        1, 0xffffff, 0.6,
      ).setDepth(7);
      this.tweens.add({
        targets: spark,
        y: spark.y - 16, alpha: 0, duration: 1500 + i * 300,
        yoyo: true, repeat: -1, delay: i * 400,
      });
    }

    // Label
    this.add.text(cfg.x, cfg.y - 28, '\u2727', {
      fontFamily: 'Courier New', fontSize: '16px', color: '#c0e0ff',
    }).setOrigin(0.5).setDepth(7).setAlpha(0.5);

    this.spawnInteractable({
      sprite: pool as any,
      label: 'Fairy Fountain',
      radius: 22,
      action: () => {
        const ps = usePlayerStore.getState();
        const char = ps.character;
        if (!char) return;
        char.hp = char.derived.maxHp;
        char.mp = char.derived.maxMp;
        ps.notify();
        this.cameras.main.flash(300, 200, 230, 255);
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'The light mends you. HP and MP fully restored.' }));
        useWorldStateStore.getState().markPicked(this.scene.key, objectId);
        pool.destroy();
        glow.destroy();
      },
    });
  }

  /**
   * Spawn a Watcher -- a mysterious ghostly figure near dungeon entrances.
   * Says one cryptic line, registers lore, then vanishes.
   */
  protected spawnWatcher(x: number, y: number): void {
    const watcher = this.add.circle(x, y, 8, 0x8080c0, 0.3);
    watcher.setDepth(12);
    const watcherGlow = this.add.circle(x, y, 16, 0x8080c0, 0.08);
    watcherGlow.setDepth(11);

    const WATCHER_LINES: Record<string, string> = {
      'MossbarrowDepthsScene': 'I walked this path. The stones remember.',
      'DepthsFloor2Scene': 'The dead do not rest here. Neither did I.',
      'DepthsFloor3Scene': 'The crown breaks. But the one who wore it... is not the one you should fear.',
      'BogDungeonF1Scene': 'The water knows your name. Do not answer.',
      'BogDungeonF2Scene': 'I found what I sought. I wish I had not.',
      'BogDungeonF3Scene': 'This warden was my friend. Be kinder than I was.',
      'DrownedSanctumF1Scene': 'The seal holds. For now.',
      'DrownedSanctumF2Scene': 'Veyrin understands. You will too, in time.',
      'IronveilScene': 'Iron remembers the hands that shaped it. Even these.',
      'AshenTowerF1Scene': 'Fire cleanses. That is what they told themselves. They were wrong.',
      'AshenTowerF2Scene': 'The forge made weapons for a war that never ended.',
      'AshenTowerF3Scene': 'I stood before this mirror once. It showed me what I was. I did not look away. I should have.',
      'FrosthollowScene': 'The mountain does not hate you. It simply does not care.',
      'FrozenHollowF1Scene': 'The cold preserves. What it keeps is not always worth keeping.',
      'FrozenHollowF2Scene': 'I came for the amulet. The cold came for me.',
      'FrozenHollowF3Scene': 'Fire against ice. The oldest war. You carry the answer now.',
      'ThroneBeneathF1Scene': 'The stairs go down. They always go down. That is the nature of thrones — they are built on what lies beneath.',
      'ThroneBeneathF2Scene': 'Every name on these walls had a reason to descend. None of them had a reason good enough.',
      'ThroneBeneathF3Scene': 'I was the last hero. I failed. You did not. Remember my name: it was written here once. It does not matter now. Yours does.',
    };

    const line = WATCHER_LINES[this.scene.key];
    if (line) {
      this.spawnInteractable({
        sprite: watcher as any,
        label: 'Approach the figure',
        radius: 28,
        action: () => {
          window.dispatchEvent(new CustomEvent('gameMessage', { detail: line }));
          useLoreStore.getState().discover({
            key: `watcher-${this.scene.key}`,
            title: 'The Watcher',
            text: line,
            location: this.getZoneName() ?? this.scene.key,
          });
          this.tweens.add({
            targets: [watcher, watcherGlow],
            alpha: 0, duration: 800,
            onComplete: () => { watcher.destroy(); watcherGlow.destroy(); },
          });
        },
      });
    }
  }

  /** Spawn a spike trap that damages the player on contact. */
  protected spawnTrap(cfg: { x: number; y: number; damage: number; label?: string }): void {
    const trap = this.add.rectangle(cfg.x, cfg.y, 24, 24, 0x808080, 0.4);
    trap.setStrokeStyle(1, 0xa0a098);
    trap.setDepth(3);
    // Spike shapes (small triangles)
    for (const [dx, dy] of [[-6,-6],[6,-6],[-6,6],[6,6],[0,0]] as [number,number][]) {
      this.add.triangle(cfg.x + dx, cfg.y + dy, 0, 4, 3, -4, -3, -4, 0x606060).setDepth(3);
    }
    this.traps.push({ x: cfg.x, y: cfg.y, damage: cfg.damage, cooldown: 0 });
  }

  /** Spawn a locked door that requires a key item to open. Once unlocked,
   *  the door is remembered in world state and will not reappear on future
   *  scene entries — the player never spends a second key on the same door. */
  protected spawnLockedDoor(cfg: {
    x: number; y: number; w: number; h: number;
    keyItem: string; label?: string;
    /** Stable id within the scene. Defaults to a coordinate hash; prefer
     *  passing an explicit, human-readable id (e.g. 'north_gate'). */
    doorId?: string;
  }): void {
    const doorId = cfg.doorId ?? `door_${cfg.x}_${cfg.y}`;
    // Already unlocked in this save? Don't respawn — treat the door as open.
    if (useWorldStateStore.getState().isDoorUnlocked(this.scene.key, doorId)) return;
    const door = this.add.rectangle(cfg.x + cfg.w/2, cfg.y + cfg.h/2, cfg.w, cfg.h, 0x6a5030);
    door.setStrokeStyle(2, 0x8a7040);
    door.setDepth(8);
    // Lock icon
    const lock = this.add.circle(cfg.x + cfg.w/2, cfg.y + cfg.h/2, 6, 0xc0a040);
    lock.setDepth(9);
    // Collision — main visible door.
    this.physics.add.existing(door, true);
    this.walls.add(door);

    // Invisible end-cap colliders. Belt-and-suspenders: if the hall tiles
    // adjacent to the gate are walkable for any reason (or a future layout
    // widens the corridor without widening the gate), players could slip
    // around the lock. These transparent walls on each side close the gap.
    // They vanish with the gate so unlocking still opens the path.
    const capLeft = this.add.rectangle(cfg.x - TILE / 2, cfg.y + cfg.h / 2, TILE, cfg.h, 0x000000, 0);
    const capRight = this.add.rectangle(cfg.x + cfg.w + TILE / 2, cfg.y + cfg.h / 2, TILE, cfg.h, 0x000000, 0);
    this.physics.add.existing(capLeft, true);
    this.physics.add.existing(capRight, true);
    this.walls.add(capLeft);
    this.walls.add(capRight);

    const doorInteract = this.add.rectangle(cfg.x + cfg.w/2, cfg.y + cfg.h/2, cfg.w + 16, cfg.h + 16, 0x000000, 0);
    doorInteract.setDepth(1);
    this.spawnInteractable({
      sprite: doorInteract as any,
      label: cfg.label ?? 'Locked door',
      radius: 28,
      action: () => {
        const inv = useInventoryStore.getState();
        if (inv.hasItem(cfg.keyItem)) {
          inv.removeItem(cfg.keyItem);
          door.destroy();
          lock.destroy();
          capLeft.destroy();
          capRight.destroy();
          const body = door.body as Phaser.Physics.Arcade.StaticBody;
          if (body) body.destroy();
          // Remember this door as permanently unlocked so a second key
          // is never needed on re-entry or after save/load.
          useWorldStateStore.getState().unlockDoor(this.scene.key, doorId);
          window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Door unlocked.' }));
        } else {
          window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Locked. You need a key.' }));
        }
      },
    });
  }

  /** Spawn a treasure chest with guaranteed loot. One-time per save file.
   *  Persisted via `worldStateStore.pickedObjects` — previously the chest
   *  re-spawned after every combat (scene.create() re-ran layout()), which
   *  was the root of the infinite-loot farming exploit. */
  protected spawnChest(cfg: {
    x: number; y: number;
    loot: Array<{ itemKey: string; qty?: number }>;
    gold?: number;
  }): void {
    const objectId = `chest_${Math.round(cfg.x)}_${Math.round(cfg.y)}`;
    if (useWorldStateStore.getState().isPicked(this.scene.key, objectId)) return;

    // Chest body
    const chest = this.add.rectangle(cfg.x, cfg.y, 24, 20, 0x6a4820);
    chest.setStrokeStyle(2, 0xc0a040);
    chest.setDepth(8);
    // Lid highlight
    const lid = this.add.rectangle(cfg.x, cfg.y - 8, 24, 6, 0x8a6830);
    lid.setStrokeStyle(1, 0xc0a040);
    lid.setDepth(8);
    // Lock clasp
    const clasp = this.add.rectangle(cfg.x, cfg.y - 2, 6, 6, 0xc0a040);
    clasp.setDepth(9);

    this.spawnInteractable({
      sprite: chest as any,
      label: 'Open chest',
      radius: 24,
      action: () => {
        const inv = useInventoryStore.getState();
        const items: string[] = [];
        for (const l of cfg.loot) {
          inv.addItem(l.itemKey, l.qty ?? 1);
          const name = getItem(l.itemKey).name;
          items.push(l.qty && l.qty > 1 ? `${name} x${l.qty}` : name);
        }
        let msg = `Chest: ${items.join(', ')}`;
        if (cfg.gold) {
          const char = usePlayerStore.getState().character;
          if (char) { char.addGold(cfg.gold); usePlayerStore.getState().notify(); }
          msg += ` +${cfg.gold}g`;
        }
        this.spawnPickupParticles(cfg.x, cfg.y, 0xffffff);
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: msg }));
        useAchievementStore.getState().recordChest();
        useWorldStateStore.getState().markPicked(this.scene.key, objectId);
        chest.destroy();
        lid.destroy();
        clasp.destroy();
      },
    });
  }

  /**
   * Spawn a shallow water zone — a translucent, ankle-deep pool that
   * the player can only wade through when the Water Charm dungeon item
   * is equipped (active B-slot). Without the charm it is a hard wall;
   * enemies are always blocked regardless so the charm can be used as
   * an escape tool. While wading, the player's speed is reduced and
   * ripples trail them (handled in update()).
   */
  protected spawnShallowWater(cfg: { x: number; y: number; w: number; h: number }): void {
    // Visual base — light teal fill with two subtle horizontal wave lines,
    // consistent with TILE.SHALLOW_WATER but scaled to the zone rect.
    const pool = this.add.rectangle(
      cfg.x + cfg.w / 2, cfg.y + cfg.h / 2, cfg.w, cfg.h, 0x4da0c0, 0.55);
    pool.setStrokeStyle(1, 0x6ecae0, 0.6);
    pool.setDepth(2);

    // Horizontal wave line overlays (purely decorative, gentle shimmer).
    const wave1 = this.add.rectangle(cfg.x + cfg.w / 2, cfg.y + cfg.h * 0.33, cfg.w * 0.85, 1, 0x7fd8e8, 0.7).setDepth(3);
    const wave2 = this.add.rectangle(cfg.x + cfg.w / 2, cfg.y + cfg.h * 0.66, cfg.w * 0.85, 1, 0x7fd8e8, 0.7).setDepth(3);
    this.tweens.add({
      targets: [wave1, wave2], alpha: { from: 0.3, to: 0.8 },
      duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // Barrier — always present so enemies can't cross. For the player we
    // toggle it every frame in update() based on whether the Water Charm
    // is equipped as the active key-item.
    const barrier = this.add.rectangle(
      cfg.x + cfg.w / 2, cfg.y + cfg.h / 2, cfg.w, cfg.h, 0x000000, 0);
    this.physics.add.existing(barrier, true);
    this.walls.add(barrier);

    this.shallowWaterZones.push({
      x: cfg.x, y: cfg.y, w: cfg.w, h: cfg.h, barrier,
    });
  }

  /** Mark the current scene as an underwater area — enables ambient
   *  bubble particles and a subtle blue tint overlay. Call from layout(). */
  protected setUnderwater(on: boolean): void {
    this.isUnderwater = on;
    if (on) this.setupUnderwaterEffects();
  }

  /** True if the current scene is flagged as an underwater area. */
  protected getIsUnderwater(): boolean { return this.isUnderwater; }

  /** Spawn the underwater ambience — slow rising bubbles + blue tint. */
  private setupUnderwaterEffects(): void {
    // Subtle blue tint overlay.
    this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0x3c8eb0, 0.18)
      .setDepth(95);

    // Continuous bubble stream — 1 new bubble every ~300ms, rising from
    // a random offscreen bottom x to the top, fading out.
    const spawnBubble = () => {
      const bx = Phaser.Math.Between(20, WORLD_W - 20);
      const by = WORLD_H + Phaser.Math.Between(0, 40);
      const r = Phaser.Math.Between(2, 5);
      const bubble = this.add.circle(bx, by, r, 0xb0e4f0, 0.55).setDepth(96);
      bubble.setStrokeStyle(1, 0xe8f8ff, 0.65);
      const travel = WORLD_H + 80;
      const duration = 4000 + Math.random() * 3000;
      this.tweens.add({
        targets: bubble,
        y: by - travel,
        x: bx + (Math.random() - 0.5) * 40,
        alpha: { from: 0.55, to: 0 },
        duration,
        ease: 'Sine.easeIn',
        onComplete: () => bubble.destroy(),
      });
    };
    const bubbleTimer = this.time.addEvent({
      delay: 300, loop: true, callback: spawnBubble,
    });
    this.events.once('shutdown', () => bubbleTimer.remove(false));
    this.events.once('destroy', () => bubbleTimer.remove(false));
    // Seed a few bubbles up-front so the effect is visible immediately.
    for (let i = 0; i < 6; i++) this.time.delayedCall(i * 120, spawnBubble);
  }

  /** True if the point is inside any registered shallow water zone. */
  private isPointInShallowWater(x: number, y: number): boolean {
    for (const z of this.shallowWaterZones) {
      if (x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h) return true;
    }
    return false;
  }

  /** Spawn a single expanding ripple ring at (x, y). */
  private spawnRipple(x: number, y: number): void {
    const ring = this.add.graphics();
    ring.setDepth(3);
    this.tweens.addCounter({
      from: 0, to: 1, duration: 700, ease: 'Sine.easeOut',
      onUpdate: (tw) => {
        const t = tw.getValue() ?? 0;
        const r = 4 + t * 20;
        ring.clear();
        ring.lineStyle(1.5, 0x8fd8ef, 1 - t);
        ring.strokeCircle(x, y, r);
      },
      onComplete: () => ring.destroy(),
    });
  }

  /** Per-frame shallow water state — speed reduction, ripples, SFX, and
   *  dynamic collision toggle so the player can wade through with the
   *  Water Charm equipped while enemies remain blocked. */
  private updateShallowWater(): void {
    if (this.shallowWaterZones.length === 0) { this.wasInShallowWater = false; return; }
    const hasCharm = useDungeonItemStore.getState().has('water_charm');
    const active = usePlayerStore.getState().activeDungeonItem === 'water_charm';
    const passable = hasCharm && active;

    const pb = this.player.body as Phaser.Physics.Arcade.Body | undefined;
    if (!pb) return;
    let inZone = false;
    for (const z of this.shallowWaterZones) {
      const body = z.barrier.body as Phaser.Physics.Arcade.StaticBody | undefined;
      const inside = this.isPointInShallowWater(this.player.x, this.player.y);
      if (inside) inZone = true;
      if (body) {
        // Toggle body: disabled when the player is near a zone AND has the
        // Water Charm active (so they can walk in). Enemies use this same
        // body; while the body is disabled, enemies could cross — but we
        // re-enable as soon as the player steps away, so the window is
        // tight. Enemies also can't typically path far from their spawn.
        const pad = TILE;
        const near =
          this.player.x >= z.x - pad && this.player.x <= z.x + z.w + pad &&
          this.player.y >= z.y - pad && this.player.y <= z.y + z.h + pad;
        body.enable = !(passable && near);
      }
    }

    if (!inZone) { this.wasInShallowWater = false; return; }

    const now = this.time.now;
    if (!this.wasInShallowWater) {
      if (now - this.lastWaterStepAt > 120) {
        Sfx.waterStep();
        this.lastWaterStepAt = now;
      }
    }
    this.wasInShallowWater = true;

    // Speed reduction ×0.7 while wading.
    pb.velocity.x *= 0.7;
    pb.velocity.y *= 0.7;

    const moving = Math.abs(pb.velocity.x) + Math.abs(pb.velocity.y) > 4;
    if (moving && now - this.lastWaterRippleAt >= 400) {
      this.lastWaterRippleAt = now;
      this.spawnRipple(this.player.x, this.player.y + 8);
    }
  }

  /** Call from subclass layout() to make this scene dark. */
  protected setDarkRoom(dark: boolean): void {
    this.isDarkRoom = dark;
  }

  /**
   * Spawn a breakable wall that requires the Pickaxe dungeon item.
   * On break, the wall is destroyed and an optional callback fires
   * (used to reveal hidden rooms / items behind the wall).
   */
  protected spawnBreakableWall(cfg: {
    x: number; y: number; w: number; h: number;
    onBreak?: () => void;
  }): void {
    const wall = this.add.rectangle(cfg.x + cfg.w / 2, cfg.y + cfg.h / 2, cfg.w, cfg.h, 0x787068);
    wall.setStrokeStyle(1, 0x585048);
    wall.setDepth(5);
    const cx = cfg.x + cfg.w / 2;
    const cy = cfg.y + cfg.h / 2;
    const cracks: Phaser.GameObjects.Line[] = [];
    for (let i = 0; i < 3; i++) {
      const crack = this.add.line(0, 0,
        cx - 8 + i * 6, cy - 6 + i * 3,
        cx + 4 + i * 4, cy + 8 - i * 2,
        0x404038).setLineWidth(1).setDepth(6);
      cracks.push(crack);
    }
    this.physics.add.existing(wall, true);
    this.walls.add(wall);

    const interactZone = this.add.rectangle(cfg.x + cfg.w / 2, cfg.y + cfg.h / 2, cfg.w + 20, cfg.h + 20, 0x000000, 0);
    this.spawnInteractable({
      sprite: interactZone as any,
      label: 'Cracked wall',
      radius: 28,
      action: () => {
        if (!useDungeonItemStore.getState().has('pickaxe')) {
          window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'The wall is cracked. You need something to break it.' }));
          return;
        }
        wall.destroy();
        for (const c of cracks) c.destroy();
        const body = wall.body as Phaser.Physics.Arcade.StaticBody;
        if (body) body.destroy();
        shakeScaled(this, 200, 0.008);
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'The wall crumbles!' }));
        this.spawnPickupParticles(cfg.x + cfg.w / 2, cfg.y + cfg.h / 2, 0x808070);
        cfg.onBreak?.();
      },
    });
  }

  /**
   * Spawn a "hollow wall" — a breakable wall variant that responds to
   * the Echo Stone pulse. The wall looks like cracked stone; when an
   * Echo pulse reaches it, it glows cyan for ~1.2s, during which the
   * player can interact (E / attack) to shatter it and reveal whatever
   * sits behind. Pre-reveal the wall reads as solid stone — "cracked"
   * is only visible after the sonar response.
   */
  protected spawnHollowWall(cfg: {
    x: number; y: number; w: number; h: number;
    onBreak?: () => void;
  }): void {
    const cx = cfg.x + cfg.w / 2;
    const cy = cfg.y + cfg.h / 2;
    const wall = this.add.rectangle(cx, cy, cfg.w, cfg.h, 0x585048);
    wall.setStrokeStyle(1, 0x3a342e);
    wall.setDepth(5);
    // Subtle crack overlay (only obvious when revealed).
    const crackA = this.add.line(0, 0, cx - 6, cy - 8, cx + 4, cy + 2, 0x2a2620).setLineWidth(1).setDepth(6);
    const crackB = this.add.line(0, 0, cx + 4, cy + 2, cx - 2, cy + 10, 0x2a2620).setLineWidth(1).setDepth(6);
    const crackC = this.add.line(0, 0, cx + 4, cy + 2, cx + 10, cy - 4, 0x2a2620).setLineWidth(1).setDepth(6);
    this.physics.add.existing(wall, true);
    this.walls.add(wall);

    let revealedUntil = 0;
    const reveal = () => {
      revealedUntil = this.time.now + 1200;
      this.tweens.killTweensOf(wall);
      wall.setFillStyle(0x7fe6ff);
      wall.setStrokeStyle(2, 0xb8f4ff);
      this.tweens.add({
        targets: wall, alpha: 0.65, duration: 300, yoyo: true, repeat: 1,
        onComplete: () => {
          if (this.time.now >= revealedUntil) {
            wall.setFillStyle(0x585048);
            wall.setStrokeStyle(1, 0x3a342e);
            wall.setAlpha(1);
          }
        },
      });
    };

    const entry = { sprite: wall, cx, cy, broken: false, reveal };
    this.hollowWalls.push(entry);

    const interactZone = this.add.rectangle(cx, cy, cfg.w + 20, cfg.h + 20, 0x000000, 0);
    this.spawnInteractable({
      sprite: interactZone as any,
      label: 'Hollow wall',
      radius: 28,
      action: () => {
        if (entry.broken) return;
        if (this.time.now > revealedUntil) {
          window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'The stone looks solid. Something ought to reveal what is hollow.' }));
          return;
        }
        entry.broken = true;
        wall.destroy();
        crackA.destroy(); crackB.destroy(); crackC.destroy();
        const body = wall.body as Phaser.Physics.Arcade.StaticBody;
        if (body) body.destroy();
        shakeScaled(this, 220, 0.009);
        Sfx.chestOpen();
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'The hollow wall shatters!' }));
        this.spawnPickupParticles(cx, cy, 0x7fe6ff);
        cfg.onBreak?.();
      },
    });
  }

  /**
   * Register an enemy sprite as "invisible". Starts at alpha 0.05 and is
   * briefly revealed (alpha 1 + cyan outline) by an Echo Stone pulse.
   */
  protected registerInvisibleEnemy(sprite: Phaser.GameObjects.Sprite | Phaser.GameObjects.Arc): void {
    sprite.setAlpha(0.06);
    const outline = this.add.circle(sprite.x, sprite.y, 18, 0x00ffff, 0).setStrokeStyle(2, 0x7fe6ff, 0);
    outline.setDepth((sprite.depth ?? 10) - 1);
    this.invisibleEnemies.push({ sprite, outline, revealedUntil: 0 });
  }

  /** Fire the Echo Stone pulse — expanding ring + reveal hollow walls + flash invisibles. */
  protected fireEchoPulse(px: number, py: number): void {
    // Primary expanding ring.
    const ring = this.add.graphics();
    ring.setDepth(90);
    let r = 0;
    const maxR = 300;
    const duration = 1800;
    this.tweens.addCounter({
      from: 0, to: 1, duration, ease: 'Sine.easeOut',
      onUpdate: (tw) => {
        r = maxR * (tw.getValue() ?? 0);
        ring.clear();
        ring.lineStyle(3, 0x7fe6ff, 1 - (tw.getValue() ?? 0));
        ring.strokeCircle(px, py, r);
        ring.lineStyle(1, 0xffffff, (1 - (tw.getValue() ?? 0)) * 0.6);
        ring.strokeCircle(px, py, Math.max(0, r - 6));
      },
      onComplete: () => ring.destroy(),
    });
    // Secondary delayed ring.
    this.time.delayedCall(100, () => {
      const ring2 = this.add.graphics();
      ring2.setDepth(89);
      this.tweens.addCounter({
        from: 0, to: 1, duration,
        onUpdate: (tw) => {
          const rr = maxR * (tw.getValue() ?? 0) * 0.85;
          ring2.clear();
          ring2.lineStyle(2, 0x5fc6ff, (1 - (tw.getValue() ?? 0)) * 0.55);
          ring2.strokeCircle(px, py, rr);
        },
        onComplete: () => ring2.destroy(),
      });
    });

    // Emit secondary reveal event for any external listeners.
    window.dispatchEvent(new CustomEvent('echoStoneReveal', { detail: { x: px, y: py, radius: maxR } }));

    // Reveal hollow walls within radius (staggered by distance).
    for (const hw of this.hollowWalls) {
      if (hw.broken) continue;
      const d = Math.hypot(hw.cx - px, hw.cy - py);
      if (d > maxR + 20) continue;
      const arrivalMs = Math.min(1600, (d / maxR) * duration);
      this.time.delayedCall(arrivalMs, () => {
        if (!hw.broken) hw.reveal();
      });
    }

    // Reveal invisible enemies for 2s + cyan outline ping.
    for (const inv of this.invisibleEnemies) {
      if (!inv.sprite.active) continue;
      const d = Math.hypot(inv.sprite.x - px, inv.sprite.y - py);
      if (d > maxR + 40) continue;
      const arrivalMs = Math.min(1600, (d / maxR) * duration);
      this.time.delayedCall(arrivalMs, () => {
        if (!inv.sprite.active) return;
        inv.revealedUntil = this.time.now + 2000;
        this.tweens.killTweensOf(inv.sprite);
        inv.sprite.setAlpha(1);
        inv.outline.setStrokeStyle(2, 0x7fe6ff, 0.9);
        inv.outline.setPosition(inv.sprite.x, inv.sprite.y);
        this.tweens.add({
          targets: inv.outline, alpha: 0.2, scale: 1.4,
          duration: 400, yoyo: true, repeat: 1,
        });
      });
    }

    Sfx.echoPulse();
    shakeScaled(this, 120, 0.004);
  }

  // ──────────────────────────────────────────────────────────────
  // Lantern + torch systems
  // ──────────────────────────────────────────────────────────────

  /** Current lit radius (with flicker). */
  protected lanternRadius(): number {
    const base = 180;
    const wave = Math.sin((this.lanternFlickerPhase / 800) * Math.PI * 2) * 8;
    return base + wave;
  }

  /**
   * Spawn a torch interactable. Unlit = brown stick on a grey base. When
   * the player walks adjacent with the lantern lit and presses E, it
   * ignites permanently (persisted via worldStateStore) and emits its own
   * circle of light. Counts toward any registered {@link torchPuzzle}.
   */
  protected spawnTorch(cfg: { id: string; x: number; y: number }): void {
    const wasLit = useWorldStateStore.getState().isTorchLit(this.scene.key, cfg.id);

    const base = this.add.rectangle(cfg.x, cfg.y + 4, 12, 6, 0x6a6660);
    base.setStrokeStyle(1, 0x3a3830);
    base.setDepth(6);
    this.add.rectangle(cfg.x, cfg.y - 4, 4, 12, 0x6a4820).setDepth(6);

    const torchEntry: (typeof this.torches)[number] = {
      id: cfg.id, x: cfg.x, y: cfg.y, lit: false,
      base, flame: null, glow: null,
    };
    this.torches.push(torchEntry);

    const ignite = (silent = false) => {
      if (torchEntry.lit) return;
      torchEntry.lit = true;
      useWorldStateStore.getState().igniteTorch(this.scene.key, cfg.id);
      const flame = this.add.circle(cfg.x, cfg.y - 10, 4, 0xf4a648, 0.9).setDepth(7);
      const glow = this.add.circle(cfg.x, cfg.y - 6, 16, 0xe09040, 0.15).setDepth(5);
      torchEntry.flame = flame;
      torchEntry.glow = glow;
      this.tweens.add({
        targets: flame, y: flame.y - 2, scale: 1.15,
        duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
      this.tweens.add({
        targets: glow, alpha: 0.08, scale: 1.2, duration: 700, yoyo: true, repeat: -1,
      });
      if (!silent) {
        Sfx.torchLight();
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'The torch catches flame.' }));
      }
      this.checkTorchPuzzle();
    };

    this.spawnInteractable({
      sprite: base as any,
      label: 'Light torch',
      radius: 28,
      action: () => {
        if (torchEntry.lit) {
          window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Already lit.' }));
          return;
        }
        if (!usePlayerStore.getState().lanternLit) {
          window.dispatchEvent(new CustomEvent('gameMessage', {
            detail: 'The wick is cold. A flame of your own would help.',
          }));
          return;
        }
        ignite();
      },
    });

    if (wasLit) ignite(true);
  }

  /** Register a "light all torches" puzzle. onComplete fires once. */
  protected registerTorchPuzzle(ids: string[], onComplete: () => void): void {
    this.torchPuzzle = { ids, completed: false, onComplete };
    this.checkTorchPuzzle();
  }

  private checkTorchPuzzle(): void {
    const p = this.torchPuzzle;
    if (!p || p.completed) return;
    const allLit = p.ids.every((id) =>
      this.torches.find((t) => t.id === id)?.lit ||
      useWorldStateStore.getState().isTorchLit(this.scene.key, id),
    );
    if (!allLit) return;
    p.completed = true;
    try { p.onComplete(); } catch (err) { console.warn('torch puzzle error', err); }
  }

  /** Per-frame lantern update — dark overlay cutouts, glow graphic, shade AI. */
  private updateLantern(): void {
    const lit = usePlayerStore.getState().lanternLit;
    this.lanternFlickerPhase = (this.lanternFlickerPhase + this.game.loop.delta) % 1e9;

    if (this.darkRT && this.darkBrush) {
      this.darkRT.clear();
      this.darkRT.fill(0x080602, 0.92);
      if (lit) {
        this.darkRT.erase(this.darkBrush, this.player.x - 180, this.player.y - 180);
      }
      if (this.torchBrush) {
        for (const t of this.torches) {
          if (!t.lit) continue;
          this.darkRT.erase(this.torchBrush, t.x - 100, t.y - 100);
        }
      }
    }

    if (this.lanternGlow) {
      if (lit) {
        this.lanternGlow.setVisible(true);
        this.lanternGlow.clear();
        const r = this.lanternRadius();
        this.lanternGlow.fillStyle(0xf4a648, 0.18);
        this.lanternGlow.fillCircle(this.player.x, this.player.y, r);
        this.lanternGlow.fillStyle(0xf4c878, 0.26);
        this.lanternGlow.fillCircle(this.player.x, this.player.y, r * 0.65);
        this.lanternGlow.fillStyle(0xfff0c0, 0.32);
        this.lanternGlow.fillCircle(this.player.x, this.player.y, r * 0.28);
      } else {
        this.lanternGlow.setVisible(false);
        this.lanternGlow.clear();
      }
    }

    this.updateShades(lit);
  }

  private updateShades(lit: boolean): void {
    const dt = this.game.loop.delta;
    const radius = this.lanternRadius();
    for (const enemy of this.enemies) {
      let monster;
      try { monster = getMonster(enemy.monsterKey); } catch { continue; }
      if (!monster.lightVulnerable) continue;

      const dx = enemy.sprite.x - this.player.x;
      const dy = enemy.sprite.y - this.player.y;
      const dist = Math.hypot(dx, dy);
      const inLight = lit && dist < radius;

      if (inLight) {
        this.shadeFleeTimers.set(enemy.id, 800);
        const accum = (this.shadeDamageAccum.get(enemy.id) ?? 0) + dt;
        this.shadeDamageAccum.set(enemy.id, accum);
        if (accum >= 3000) {
          useCombatStore.getState().killedEnemies.add(enemy.id);
          this.spawnPickupParticles(enemy.sprite.x, enemy.sprite.y, 0xf4c878);
          enemy.sprite.destroy();
          this.shadeDamageAccum.delete(enemy.id);
          this.shadeFleeTimers.delete(enemy.id);
        }
      }

      const fleeMs = this.shadeFleeTimers.get(enemy.id) ?? 0;
      if (fleeMs > 0 && enemy.sprite.active) {
        this.shadeFleeTimers.set(enemy.id, Math.max(0, fleeMs - dt));
        const len = Math.max(1, Math.hypot(dx, dy));
        const step = 90 * (dt / 1000);
        enemy.sprite.x += (dx / len) * step;
        enemy.sprite.y += (dy / len) * step;
        enemy.sprite.setAlpha(0.5 + Math.random() * 0.3);
      }
    }
    for (const id of Array.from(this.shadeDamageAccum.keys())) {
      if (!this.enemies.find((e) => e.id === id)) this.shadeDamageAccum.delete(id);
    }
  }

  /**
   * Spawn an ancient coin pickup. Golden shimmer, one-time per save.
   * Collecting all 12 unlocks the Crownless Blade.
   */
  protected spawnAncientCoin(cfg: { x: number; y: number; coinId: string; inscription: string }): void {
    if (usePlayerStore.getState().ancientCoins.has(cfg.coinId)) return;

    const coin = this.add.circle(cfg.x, cfg.y, 5, 0xc0a040);
    coin.setStrokeStyle(1, 0xe0c060);
    coin.setDepth(8);
    // Golden shimmer
    this.tweens.add({ targets: coin, alpha: 0.5, duration: 1200, yoyo: true, repeat: -1 });

    this.spawnInteractable({
      sprite: coin as any, label: 'Ancient Coin', radius: 18,
      action: () => {
        usePlayerStore.getState().collectCoin(cfg.coinId);
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: cfg.inscription }));
        coin.destroy();
        this.spawnPickupParticles(cfg.x, cfg.y, 0xe0c060);
      },
    });
  }

  /**
   * Spawn an ice wall that requires the Flame Amulet dungeon item to melt.
   * On melt, the wall is destroyed and an optional callback fires.
   */
  protected spawnIceWall(cfg: { x: number; y: number; w: number; h: number; onMelt?: () => void }): void {
    const wall = this.add.rectangle(cfg.x + cfg.w / 2, cfg.y + cfg.h / 2, cfg.w, cfg.h, 0x80b0d0);
    wall.setStrokeStyle(1, 0xa0d0f0);
    wall.setDepth(5);
    this.physics.add.existing(wall, true);
    this.walls.add(wall);

    const interactZone = this.add.rectangle(cfg.x + cfg.w / 2, cfg.y + cfg.h / 2, cfg.w + 20, cfg.h + 20, 0x000000, 0);
    this.spawnInteractable({
      sprite: interactZone as any, label: 'Ice wall', radius: 28,
      action: () => {
        if (!useDungeonItemStore.getState().has('flame_amulet')) {
          window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Solid ice. Something warm might melt it.' }));
          return;
        }
        wall.destroy();
        const body = wall.body as Phaser.Physics.Arcade.StaticBody;
        if (body) body.destroy();
        shakeScaled(this, 150, 0.006);
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'The ice melts away.' }));
        this.spawnPickupParticles(cfg.x + cfg.w / 2, cfg.y + cfg.h / 2, 0x80c0e0);
        cfg.onMelt?.();
      },
    });
  }

  /**
   * Spawn a pickaxe-mineable ore vein. Three types: iron (grey + brown),
   * silver (white shimmer), gold (yellow sparkle). Each press of E while
   * adjacent + pickaxe equipped shakes the vein and increments hits. On
   * depletion, drops one ore item of the matching type into the inventory
   * and permanently removes the vein from this save.
   */
  protected spawnOreVein(cfg: {
    x: number; y: number;
    oreType: 'iron' | 'silver' | 'gold';
    hitsRequired?: number;
  }): void {
    const objectId = `ore_${Math.round(cfg.x)}_${Math.round(cfg.y)}`;
    if (useWorldStateStore.getState().isMined(this.scene.key, objectId)) return;

    const hitsRequired = cfg.hitsRequired ?? 3;
    const oreItemKey = `${cfg.oreType}_ore`;

    const palette = {
      iron:   { base: 0x585048, streak: 0x7a5a3a, sparkle: 0xa08060, particle: 0x808070 },
      silver: { base: 0x606878, streak: 0xd0d8e0, sparkle: 0xf0f4ff, particle: 0xd0d8e0 },
      gold:   { base: 0x504028, streak: 0xc89028, sparkle: 0xf4d860, particle: 0xf4d488 },
    }[cfg.oreType];

    const rock = this.add.rectangle(cfg.x, cfg.y, 28, 24, palette.base);
    rock.setStrokeStyle(2, 0x2a2620);
    rock.setDepth(5);
    const streakA = this.add.rectangle(cfg.x - 4, cfg.y - 2, 12, 3, palette.streak).setDepth(6);
    streakA.setAngle(-18);
    const streakB = this.add.rectangle(cfg.x + 5, cfg.y + 4, 10, 2, palette.streak).setDepth(6);
    streakB.setAngle(12);
    const sparkle = this.add.circle(cfg.x + 2, cfg.y - 4, 2, palette.sparkle).setDepth(7);
    if (cfg.oreType !== 'iron') {
      this.tweens.add({ targets: sparkle, alpha: 0.3, duration: 900, yoyo: true, repeat: -1 });
    }

    this.physics.add.existing(rock, true);
    this.walls.add(rock);

    let hits = 0;
    const parts: Phaser.GameObjects.GameObject[] = [rock, streakA, streakB, sparkle];

    const interactZone = this.add.rectangle(cfg.x, cfg.y, 48, 44, 0x000000, 0);
    this.spawnInteractable({
      sprite: interactZone as any,
      label: `${cfg.oreType[0].toUpperCase()}${cfg.oreType.slice(1)} vein`,
      radius: 28,
      action: () => this.mineObject({
        parts,
        bodyHost: rock,
        cx: cfg.x, cy: cfg.y,
        hitsRequiredRef: () => hitsRequired,
        incrementHits: () => ++hits,
        particleColor: palette.particle,
        objectId,
        onShatter: () => {
          useInventoryStore.getState().addItem(oreItemKey);
          const prettyName = `${cfg.oreType[0].toUpperCase()}${cfg.oreType.slice(1)} Ore`;
          window.dispatchEvent(new CustomEvent('gameMessage', { detail: `Found ${prettyName}!` }));
        },
      }),
    });
  }

  /**
   * Spawn a boulder blocking a path. Needs 5 pickaxe hits (default) to
   * shatter, then is permanently passable for this save.
   */
  protected spawnBoulder(cfg: { x: number; y: number; hitsRequired?: number }): void {
    const objectId = `boulder_${Math.round(cfg.x)}_${Math.round(cfg.y)}`;
    if (useWorldStateStore.getState().isMined(this.scene.key, objectId)) return;

    const hitsRequired = cfg.hitsRequired ?? 5;

    const boulder = this.add.rectangle(cfg.x, cfg.y, 40, 36, 0x585048);
    boulder.setStrokeStyle(2, 0x2a2620);
    boulder.setDepth(5);
    const lumpA = this.add.circle(cfg.x - 8, cfg.y - 6, 7, 0x6a5e50).setDepth(6);
    const lumpB = this.add.circle(cfg.x + 10, cfg.y + 4, 6, 0x484038).setDepth(6);
    const parts: Phaser.GameObjects.GameObject[] = [boulder, lumpA, lumpB];

    this.physics.add.existing(boulder, true);
    this.walls.add(boulder);

    let hits = 0;
    const interactZone = this.add.rectangle(cfg.x, cfg.y, 64, 60, 0x000000, 0);
    this.spawnInteractable({
      sprite: interactZone as any, label: 'Boulder', radius: 34,
      action: () => this.mineObject({
        parts,
        bodyHost: boulder,
        cx: cfg.x, cy: cfg.y,
        hitsRequiredRef: () => hitsRequired,
        incrementHits: () => ++hits,
        particleColor: 0x808070,
        objectId,
        onShatter: () => {
          this.spawnDebrisBurst(cfg.x, cfg.y, 0x706860);
          window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'The boulder crumbles to rubble.' }));
        },
      }),
    });
  }

  /**
   * Spawn a cracked-stone wall — the always-visible pickaxe counterpart
   * to the Echo Stone hollow wall. Default 4 pickaxe hits to break.
   */
  protected spawnCrackedWall(cfg: { x: number; y: number; w?: number; h?: number; hitsRequired?: number; onBreak?: () => void }): void {
    const w = cfg.w ?? TILE;
    const h = cfg.h ?? TILE;
    const cx = cfg.x + w / 2;
    const cy = cfg.y + h / 2;
    const objectId = `crackwall_${Math.round(cfg.x)}_${Math.round(cfg.y)}`;
    if (useWorldStateStore.getState().isMined(this.scene.key, objectId)) {
      cfg.onBreak?.();
      return;
    }

    const hitsRequired = cfg.hitsRequired ?? 4;

    const wall = this.add.rectangle(cx, cy, w, h, 0x706860);
    wall.setStrokeStyle(2, 0x2a2620);
    wall.setDepth(5);
    // Obvious cracks — visible without pulse.
    const crackA = this.add.line(0, 0, cx - 10, cy - 10, cx + 6, cy - 2, 0x1a140e).setLineWidth(2).setDepth(6);
    const crackB = this.add.line(0, 0, cx + 6, cy - 2, cx - 4, cy + 10, 0x1a140e).setLineWidth(2).setDepth(6);
    const crackC = this.add.line(0, 0, cx - 4, cy + 10, cx + 10, cy + 12, 0x1a140e).setLineWidth(2).setDepth(6);
    const crackD = this.add.line(0, 0, cx + 2, cy + 2, cx + 12, cy - 8, 0x1a140e).setLineWidth(1).setDepth(6);
    const parts: Phaser.GameObjects.GameObject[] = [wall, crackA, crackB, crackC, crackD];

    this.physics.add.existing(wall, true);
    this.walls.add(wall);

    let hits = 0;
    const interactZone = this.add.rectangle(cx, cy, w + 20, h + 20, 0x000000, 0);
    this.spawnInteractable({
      sprite: interactZone as any, label: 'Cracked wall', radius: 28,
      action: () => this.mineObject({
        parts,
        bodyHost: wall,
        cx, cy,
        hitsRequiredRef: () => hitsRequired,
        incrementHits: () => ++hits,
        particleColor: 0x8a7a60,
        objectId,
        onShatter: () => {
          this.spawnDebrisBurst(cx, cy, 0x8a7a60);
          window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'The cracked wall shatters!' }));
          cfg.onBreak?.();
        },
      }),
    });
  }

  /**
   * Shared mining handler. Requires the pickaxe to be both owned and
   * currently equipped (active). Otherwise shows a prompt-style message.
   */
  private mineObject(args: {
    parts: Phaser.GameObjects.GameObject[];
    bodyHost: Phaser.GameObjects.Rectangle;
    cx: number; cy: number;
    hitsRequiredRef: () => number;
    incrementHits: () => number;
    particleColor: number;
    objectId: string;
    onShatter: () => void;
  }): void {
    const player = usePlayerStore.getState();
    const active = player.activeDungeonItem;
    const hasPick = useDungeonItemStore.getState().has('pickaxe');
    if (!hasPick || active !== 'pickaxe') {
      window.dispatchEvent(new CustomEvent('gameMessage', {
        detail: hasPick
          ? 'You need the pickaxe equipped. (Shift+R to cycle key items.)'
          : 'The stone is cracked and loose. A pickaxe could break it.',
      }));
      return;
    }

    Sfx.mineHit();
    // Small shake on the object parts (±2px horizontal).
    const movable = args.parts.filter((p): p is Phaser.GameObjects.GameObject & { x: number } =>
      'x' in p && typeof (p as any).x === 'number');
    this.tweens.killTweensOf(movable);
    this.tweens.add({
      targets: movable, x: '+=2', duration: 40, yoyo: true, repeat: 1,
    });
    shakeScaled(this, 60, 0.003);

    const nextHits = args.incrementHits();
    if (nextHits >= args.hitsRequiredRef()) {
      Sfx.oreShatter();
      shakeScaled(this, 220, 0.01);
      this.spawnPickupParticles(args.cx, args.cy, args.particleColor);
      useWorldStateStore.getState().markMined(this.scene.key, args.objectId);
      const body = args.bodyHost.body as Phaser.Physics.Arcade.StaticBody;
      if (body) body.destroy();
      for (const p of args.parts) p.destroy();
      args.onShatter();
    }
  }

  /** Small debris-scatter effect for shattered boulders / cracked walls. */
  private spawnDebrisBurst(x: number, y: number, color: number): void {
    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 30 + Math.random() * 40;
      const chunk = this.add.rectangle(x, y, 3 + Math.random() * 3, 3 + Math.random() * 3, color).setDepth(30);
      this.tweens.add({
        targets: chunk,
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed + 20,
        alpha: 0,
        duration: 500 + Math.random() * 250,
        ease: 'Cubic.easeOut',
        onComplete: () => chunk.destroy(),
      });
    }
  }

  /**
   * Spawn a pushable block. Press E near it to shove it one tile in
   * the direction the player is facing. Used for pressure-plate puzzles.
   */
  protected spawnPushBlock(cfg: { tileX: number; tileY: number; color?: number }): void {
    const bx = cfg.tileX * TILE + TILE / 2;
    const by = cfg.tileY * TILE + TILE / 2;

    const block = this.add.rectangle(bx, by, TILE - 2, TILE - 2, cfg.color ?? 0x686060);
    block.setStrokeStyle(2, 0x484040);
    block.setDepth(8);
    const diamond = this.add.rectangle(bx, by, 10, 10, 0x585050);
    diamond.setDepth(9);
    diamond.setAngle(45);

    // Solid — collides with the player
    this.physics.add.existing(block, true);
    this.walls.add(block);

    const blockData = { sprite: block, diamond, tileX: cfg.tileX, tileY: cfg.tileY };
    this.pushBlocks.push(blockData);

    this.spawnInteractable({
      sprite: block as any,
      label: 'Push',
      radius: 20,
      action: () => {
        const dx = block.x - this.player.x;
        const dy = block.y - this.player.y;
        let pushDirX = 0;
        let pushDirY = 0;
        if (Math.abs(dx) > Math.abs(dy)) {
          pushDirX = dx > 0 ? 1 : -1;
        } else {
          pushDirY = dy > 0 ? 1 : -1;
        }

        const newTX = blockData.tileX + pushDirX;
        const newTY = blockData.tileY + pushDirY;

        // Bounds check
        if (newTX < 0 || newTX >= Math.floor(WORLD_W / TILE) || newTY < 0 || newTY >= Math.floor(WORLD_H / TILE)) return;

        // Blocked by another push block?
        if (this.pushBlocks.some(b => b !== blockData && b.tileX === newTX && b.tileY === newTY)) return;

        const targetX = newTX * TILE + TILE / 2;
        const targetY = newTY * TILE + TILE / 2;

        blockData.tileX = newTX;
        blockData.tileY = newTY;

        const staticBody = block.body as Phaser.Physics.Arcade.StaticBody;

        this.tweens.add({
          targets: [block, diamond],
          x: targetX,
          y: targetY,
          duration: 200,
          ease: 'Power2',
          onComplete: () => {
            // Block game object is now at (targetX, targetY) from the tween;
            // updateFromGameObject re-centers the static body on it.
            staticBody.updateFromGameObject();
            this.checkPressurePlates();
          },
        });

        shakeScaled(this, 50, 0.003);
      },
    });
  }

  /**
   * Spawn a pressure plate. When a push block is moved onto it, the
   * plate activates and fires its callback (reveal chest, open path, etc.).
   */
  protected spawnPressurePlate(cfg: { tileX: number; tileY: number; onActivate: () => void }): void {
    const px = cfg.tileX * TILE + TILE / 2;
    const py = cfg.tileY * TILE + TILE / 2;

    const plate = this.add.rectangle(px, py, TILE - 8, TILE - 8, 0xa09040, 0.6);
    plate.setStrokeStyle(1, 0xc0b050);
    plate.setDepth(3);

    this.pressurePlates.push({
      tileX: cfg.tileX, tileY: cfg.tileY,
      sprite: plate, activated: false,
      onActivate: cfg.onActivate,
    });
  }

  private checkPressurePlates(): void {
    for (const plate of this.pressurePlates) {
      if (plate.activated) continue;
      const blockOnPlate = this.pushBlocks.some(b => b.tileX === plate.tileX && b.tileY === plate.tileY);
      if (blockOnPlate) {
        plate.activated = true;
        plate.sprite.setFillStyle(0x60c060, 0.8);
        shakeScaled(this, 100, 0.005);
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Click. Something opens.' }));
        plate.onActivate();
      }
    }
  }

  /**
   * Spawn a grapple point that teleports the player across a gap when
   * they possess the Grapple Hook dungeon item.
   */
  protected spawnGrapplePoint(cfg: { fromX: number; fromY: number; toX: number; toY: number }): void {
    const hasHook = useDungeonItemStore.getState().has('grapple_hook');
    const hook = this.add.circle(cfg.fromX, cfg.fromY, 6, hasHook ? 0xc0a040 : 0x808080, hasHook ? 1 : 0.4);
    hook.setStrokeStyle(1, hasHook ? 0xe0c060 : 0x606060);
    hook.setDepth(7);
    if (hasHook) this.tweens.add({ targets: hook, scale: 1.3, alpha: 0.6, duration: 1000, yoyo: true, repeat: -1 });

    this.spawnInteractable({
      sprite: hook as any, label: hasHook ? 'Use grapple hook' : 'Metal ring (need hook)', radius: 22,
      action: () => {
        if (!useDungeonItemStore.getState().has('grapple_hook')) {
          window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'A metal ring in the wall. You need something to grab it.' }));
          return;
        }
        this.cameras.main.flash(200, 200, 200, 200);
        this.player.setPosition(cfg.toX, cfg.toY);
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'You swing across.' }));
      },
    });
  }

  /**
   * Spawn a heart piece pickup. Distinctive red circle with a pulse glow.
   * One-time per save (tracked by a unique id in playerStore).
   */
  protected spawnHeartPiece(x: number, y: number, sceneKey?: string): void {
    const hpId = `heart_${sceneKey ?? this.scene.key}_${x}_${y}`;
    if (usePlayerStore.getState().heartPiecesCollected.has(hpId)) return;

    const heart = this.add.circle(x, y, 6, 0xc04040);
    heart.setStrokeStyle(1, 0xe06060);
    heart.setDepth(8);
    this.tweens.add({ targets: heart, scale: 1.2, alpha: 0.7, duration: 800, yoyo: true, repeat: -1 });

    this.spawnInteractable({
      sprite: heart as any, label: 'Heart Piece', radius: 20,
      action: () => {
        usePlayerStore.getState().collectHeartPiece(hpId);
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Heart Piece collected!' }));
        heart.destroy();
      },
    });
  }

  /** Spawn an enemy with patrol movement. Skips enemies killed this visit. */
  protected spawnEnemy(cfg: { monsterKey: string; x: number; y: number; color?: number }): void {
    const enemyId = `${this.scene.key}-${cfg.monsterKey}-${cfg.x}-${cfg.y}`;

    // If this enemy was killed during the current zone visit, don't respawn it.
    if (useCombatStore.getState().killedEnemies.has(enemyId)) return;

    // Randomize position slightly so each visit feels different.
    const jitterX = Phaser.Math.Between(-24, 24);
    const jitterY = Phaser.Math.Between(-24, 24);
    const finalX = cfg.x + jitterX;
    const finalY = cfg.y + jitterY;

    const spriteKey = `world-${cfg.monsterKey}`;
    generateMonsterSprite(this, spriteKey, cfg.monsterKey);

    const enemy = this.add.sprite(finalX, finalY, spriteKey, 0);
    enemy.setScale(0.8);
    enemy.setDepth(10);
    // Pseudo-3D: drop shadow + Y-sort
    if (this.pseudo3d) {
      // Boss-sized enemies get a bigger shadow
      const isBoss = /king|warden|forgotten|crownless/i.test(cfg.monsterKey);
      const width = isBoss ? 36 : 18;
      const height = isBoss ? 9 : 5;
      this.pseudo3d.addShadow(enemy, { width, height, offsetY: 12, alpha: 0.5 });
      this.pseudo3d.ySort(enemy);
    }

    this.enemies.push({
      sprite: enemy, monsterKey: cfg.monsterKey, id: enemyId,
      baseX: finalX, baseY: finalY,
      patrolDir: Math.random() > 0.5 ? 1 : -1,
      patrolTimer: Math.random() * 3000,
    });
  }

  /**
   * Spawn an enemy that is invisible until revealed by an Echo Stone pulse.
   * Same semantics as spawnEnemy() — combat + killed-tracking still apply —
   * but the sprite alpha is driven by the Echo Stone reveal window.
   */
  protected spawnInvisibleEnemy(cfg: { monsterKey: string; x: number; y: number }): void {
    const before = this.enemies.length;
    this.spawnEnemy(cfg);
    const after = this.enemies.length;
    if (after > before) {
      const spawned = this.enemies[after - 1];
      this.registerInvisibleEnemy(spawned.sprite);
    }
  }

  /** Spawn an NPC sprite at tile coords, with name floating above. */
  protected spawnNpc(cfg: { key: string; dialogueId: string; x: number; y: number }): void {
    const data = getNPC(cfg.key);
    if (!data) {
      console.warn(`scene: unknown NPC "${cfg.key}", skipping`);
      return;
    }

    const spriteKey = `npc-${cfg.key}`;
    const npcRace = getNpcRace(cfg.key);
    const npcEquip = getNpcEquip(cfg.key);
    const npcGender = getNpcGender(cfg.key);
    generateCharacterSprite(this, spriteKey, getNpcPalette(cfg.key, data.portraitColor), npcRace, 'fighter', npcEquip, npcGender);

    const sprite = this.add.sprite(cfg.x, cfg.y, spriteKey, 0); // face down
    sprite.setDepth(10);
    // Pseudo-3D: drop shadow + Y-sort
    if (this.pseudo3d) {
      this.pseudo3d.addShadow(sprite, { width: 20, height: 5, offsetY: 14, alpha: 0.4 });
      this.pseudo3d.ySort(sprite);
    }
    this.physics.add.existing(sprite, true);
    // Collision body centered on feet
    const body = sprite.body as Phaser.Physics.Arcade.StaticBody;
    body.setSize(16, 16);
    body.setOffset((SPRITE_W - 16) / 2, SPRITE_H - 20);
    this.walls.add(sprite);

    const nameLabel = this.add
      .text(cfg.x, cfg.y - SPRITE_H / 2 - 4, data.name, {
        fontFamily: 'Courier New',
        fontSize: '12px',
        color: '#d4a968',
        backgroundColor: 'rgba(10,6,6,0.65)',
        padding: { x: 4, y: 1 },
      })
      .setOrigin(0.5, 1)
      .setDepth(11);

    this.npcs.push({
      key: cfg.key,
      name: data.name,
      dialogueId: cfg.dialogueId,
      sprite,
      nameLabel,
    });

    // Idle animation — subtle breathing bob so NPCs feel alive.
    // 3-4px vertical oscillation every ~2.5 seconds.
    this.tweens.add({
      targets: sprite,
      y: cfg.y - 2,
      duration: 1200 + Math.random() * 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Occasional head-turn: cycle through facing frames every 4-8 seconds
    this.time.addEvent({
      delay: 4000 + Math.random() * 4000,
      loop: true,
      callback: () => {
        if (!sprite.active) return;
        // Random facing: 0=down, 1=up, 2=left, 3=right
        const newFacing = Math.floor(Math.random() * 4);
        sprite.setFrame(newFacing);
        if (newFacing === 3) sprite.setFlipX(true);
        else sprite.setFlipX(false);
      },
    });
  }

  /**
   * Register a rectangular region that, when the player overlaps it,
   * transitions to `targetScene` and spawns at `targetSpawn`. Optionally
   * places a visible arrow marker at the center.
   */
  protected addExit(opts: {
    x: number;
    y: number;
    w: number;
    h: number;
    targetScene: string;
    targetSpawn: string;
    label?: string;
  }): void {
    let marker: Phaser.GameObjects.Text | null = null;
    if (opts.label) {
      marker = this.add
        .text(opts.x + opts.w / 2, opts.y + opts.h / 2, opts.label, {
          fontFamily: 'Courier New',
          fontSize: '12px',
          color: '#d4a968',
        })
        .setOrigin(0.5)
        .setAlpha(0.6)
        .setDepth(15);
    }
    this.exits.push({
      x: opts.x,
      y: opts.y,
      w: opts.w,
      h: opts.h,
      marker,
      targetScene: opts.targetScene,
      targetSpawn: opts.targetSpawn,
    });
  }

  // ──────────────────────────────────────────────────────────────
  // Private per-frame helpers
  // ──────────────────────────────────────────────────────────────

  private createWorldBounds(): void {
    const edges = [
      { x: WORLD_W / 2, y: -4, w: WORLD_W, h: 8 },
      { x: WORLD_W / 2, y: WORLD_H + 4, w: WORLD_W, h: 8 },
      { x: -4, y: WORLD_H / 2, w: 8, h: WORLD_H },
      { x: WORLD_W + 4, y: WORLD_H / 2, w: 8, h: WORLD_H },
    ];
    for (const e of edges) {
      const edge = this.add.rectangle(e.x, e.y, e.w, e.h, 0x000000).setVisible(false);
      this.physics.add.existing(edge, true);
      this.walls.add(edge);
    }
  }

  private createPlayer(spawnX: number, spawnY: number): void {
    const character = usePlayerStore.getState().character;

    // Generate player sprite with race-specific proportions + class equipment.
    const raceKey = character?.race.key ?? 'human';
    const classKey = character?.characterClass.key ?? 'fighter';
    const genderKey = character?.gender ?? 'male';
    const colors = playerPalette(raceKey, classKey, character?.playerChoice ?? undefined);
    generateCharacterSprite(this, 'player-sprite', colors, raceKey, classKey, undefined, genderKey);

    this.player = this.add.sprite(spawnX, spawnY, 'player-sprite', 0);
    this.player.setDepth(10);
    // Pseudo-3D: drop shadow + Y-sort for natural "behind/in-front" depth
    if (this.pseudo3d) {
      this.pseudo3d.addShadow(this.player, { width: 22, height: 6, offsetY: 14, alpha: 0.45 });
      this.pseudo3d.ySort(this.player);
    }
    this.physics.add.existing(this.player);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    // Collision box smaller than sprite (just the feet area).
    body.setSize(16, 16);
    body.setOffset((SPRITE_W - 16) / 2, SPRITE_H - 20);
    body.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.walls);

    this.playerNameLabel = this.add
      .text(spawnX, spawnY - SPRITE_H / 2 - 4, character?.name ?? '???', {
        fontFamily: 'Courier New',
        fontSize: '12px',
        color: '#f4d488',
        backgroundColor: 'rgba(10,6,6,0.65)',
        padding: { x: 4, y: 1 },
      })
      .setOrigin(0.5, 1)
      .setDepth(11);
  }

  /**
   * Failsafes to prevent the player getting "stuck" after an interaction:
   *  - Listen for `dialogueClosed` and clear any lingering nearby target /
   *    proximity prompt so the next frame resumes cleanly.
   *  - Global Esc handler — NUCLEAR ESCAPE HATCH: hard-resets every
   *    possible lock source so the player can always recover.
   *  - A watchdog that detects "input received but no movement + no
   *    legitimate lock" stuck states and force-unsticks.
   *  - A visible "Press Esc to unstick" prompt after 3s of lock + idle.
   */
  private setupInteractionFailsafes(): void {
    const onDialogueClosed = () => {
      this.nearbyTarget = null;
      if (this.prompt) this.prompt.setVisible(false);
    };

    // Track the most recent movement input we observed so the watchdog
    // can tell "user is trying to move" from "user isn't pressing anything".
    this.lastMovementInputAt = 0;
    this.lastPlayerMoveAt = Date.now();

    const onKeyDown = (e: KeyboardEvent) => {
      // Track any WASD/arrow press so the watchdog sees movement intent.
      const k = e.key;
      if (k === 'w' || k === 'a' || k === 's' || k === 'd' ||
          k === 'W' || k === 'A' || k === 'S' || k === 'D' ||
          k === 'ArrowUp' || k === 'ArrowDown' ||
          k === 'ArrowLeft' || k === 'ArrowRight') {
        this.lastMovementInputAt = Date.now();
      }
      if (e.key !== 'Escape') return;

      // ── NUCLEAR ESCAPE HATCH ──
      // Hard-reset EVERY known lock flag. Safe even when nothing is stuck
      // because each reset either matches the already-clean state or
      // closes an overlay that was legitimately open (the React overlay
      // also handles Esc; this runs in parallel as a belt-and-suspenders).
      try {
        const ds = useDialogueStore.getState();
        if (ds.dialogue) ds.end();
      } catch { /* ignore */ }

      try {
        const cs = useCombatStore.getState();
        // If a combat state exists but the overlay isn't draining it,
        // finish() cleans up rewards/loot; if there's nothing to finish,
        // this is a cheap no-op.
        if (cs.state) cs.finish();
      } catch { /* ignore */ }

      // Clear scene-local interaction state.
      this.nearbyTarget = null;
      this.transitionLock = false;
      if (this.prompt) this.prompt.setVisible(false);

      // If the scene was paused by an overlay that never unpaused,
      // resume it.
      if (this.scene.isPaused(this.scene.key)) {
        this.scene.resume(this.scene.key);
      }

      // Re-zero velocity so any stale scaling from updateShallowWater
      // or similar doesn't carry a phantom "push" on the next frame.
      const body = this.player?.body as Phaser.Physics.Arcade.Body | undefined;
      body?.setVelocity(0, 0);
    };
    window.addEventListener('dialogueClosed', onDialogueClosed);
    window.addEventListener('keydown', onKeyDown);

    // ── Watchdog ──
    // Every 500 ms check: has the user been pressing movement keys but
    // the player hasn't moved, AND no legitimate lock is active? If so,
    // we're stuck — force-clear every lock. Errors silently swallowed so
    // the timer never stops.
    const watchdog = this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => this.runLockWatchdog(),
    });

    // ── Pause-mismatch watchdog ──
    // Every 2 s, check that the actual Phaser scene pause state matches
    // what the React modal layer expects. If no modal is open (React
    // gameStats.paused === false) but the scene is paused, force-resume.
    // This recovers from any future race condition where scene.start()
    // happens while an overlay is transiently open, leaving the new scene
    // paused after the overlay closes.
    const pauseWatchdog = this.time.addEvent({
      delay: 2000,
      loop: true,
      callback: () => {
        try {
          const reactPaused = useGameStatsStore.getState().paused;
          const sceneKey = this.scene.key;
          if (!reactPaused && this.scene.isPaused(sceneKey)) {
            // eslint-disable-next-line no-console
            console.warn(`[${sceneKey}] pause-mismatch: React says unpaused, scene was paused — force-resuming`);
            this.scene.resume(sceneKey);
          }
          // If combat store has non-null state but no CombatScene is
          // active anywhere, the store got orphaned by a scene swap —
          // clear it so the watchdog's lock-check can return to idle.
          const cs = useCombatStore.getState();
          const combatActive = !!this.game?.scene?.isActive?.('CombatScene');
          if (cs.state && !combatActive) {
            // eslint-disable-next-line no-console
            console.warn(`[${sceneKey}] orphaned combat state — clearing`);
            useCombatStore.setState({
              state: null,
              monster: null,
              log: [],
              combatEvents: [],
              lastLoot: [],
              _enemyActing: false,
              _pendingEnemyId: '',
            } as Partial<typeof cs>);
          }
        } catch { /* watchdog never throws */ }
      },
    });

    const cleanup = () => {
      window.removeEventListener('dialogueClosed', onDialogueClosed);
      window.removeEventListener('keydown', onKeyDown);
      watchdog.remove(false);
      pauseWatchdog.remove(false);
      this.stuckHintText?.destroy();
      this.stuckHintText = null;
    };
    this.events.once('shutdown', cleanup);
    this.events.once('destroy', cleanup);
  }

  /** Returns true if a legitimate lock is active (dialogue / combat / menu open). */
  private isLegitimatelyLocked(): boolean {
    if (useDialogueStore.getState().dialogue) return true;
    if (useCombatStore.getState().state) return true;
    const inv = useInventoryStore.getState();
    if (inv.isOpen || inv.isShopOpen || inv.isCraftingOpen || inv.isCookingOpen) return true;
    if (this.transitionLock) return true;
    return false;
  }

  /** Per-tick (500ms) stuck detection. */
  private runLockWatchdog(): void {
    try {
      if (!this.player || !this.player.body) return;
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      const now = Date.now();
      const moving = Math.abs(body.velocity.x) + Math.abs(body.velocity.y) > 1;
      if (moving) {
        this.lastPlayerMoveAt = now;
        this.hideStuckHint();
        return;
      }
      const recentMovementInput = now - this.lastMovementInputAt < 800;
      const idleFor = now - this.lastPlayerMoveAt;

      if (recentMovementInput && idleFor > 1000 && !this.isLegitimatelyLocked()) {
        // User is pressing WASD but not moving and nothing legit is
        // blocking — we're stuck. Force-clear every lock we know about.
        try { useDialogueStore.getState().end(); } catch { /* ignore */ }
        this.nearbyTarget = null;
        this.transitionLock = false;
        if (this.prompt) this.prompt.setVisible(false);
        if (this.scene.isPaused(this.scene.key)) this.scene.resume(this.scene.key);
        this.lastPlayerMoveAt = now; // give it a beat before re-triggering
      }

      // Show the hint if we've been idle + locked for 3s+.
      if (idleFor > 3000 && this.isLegitimatelyLocked()) {
        this.showStuckHint();
      } else {
        this.hideStuckHint();
      }
    } catch { /* watchdog never throws */ }
  }

  private showStuckHint(): void {
    if (this.stuckHintText) { this.stuckHintText.setVisible(true); return; }
    const cam = this.cameras.main;
    this.stuckHintText = this.add
      .text(cam.width / 2, cam.height - 18, 'Press Esc to unstick', {
        fontFamily: 'Courier New',
        fontSize: '11px',
        color: '#d4a968',
        backgroundColor: 'rgba(10,6,6,0.7)',
        padding: { x: 6, y: 2 },
      })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setDepth(9999);
  }

  private hideStuckHint(): void {
    if (this.stuckHintText) this.stuckHintText.setVisible(false);
  }

  private setupInput(): void {
    const kb = this.input.keyboard!;
    this.cursors = kb.createCursorKeys();
    this.keyW = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyE = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E);
  }

  private createPrompt(): void {
    this.prompt = this.add
      .text(0, 0, '', {
        fontFamily: 'Courier New',
        fontSize: '13px',
        color: '#f4d488',
        backgroundColor: 'rgba(10,6,6,0.85)',
        padding: { x: 6, y: 3 },
      })
      .setOrigin(0.5, 1)
      .setDepth(100)
      .setVisible(false);
  }

  private handleMovement(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    let vx = 0;
    let vy = 0;
    if (this.cursors.left?.isDown || this.keyA.isDown) vx -= 1;
    if (this.cursors.right?.isDown || this.keyD.isDown) vx += 1;
    if (this.cursors.up?.isDown || this.keyW.isDown) vy -= 1;
    if (this.cursors.down?.isDown || this.keyS.isDown) vy += 1;
    // Touch input (mobile joystick)
    if (window.__touchInput) {
      const ti = window.__touchInput;
      if (ti.x < -0.3) vx -= 1;
      if (ti.x >  0.3) vx += 1;
      if (ti.y < -0.3) vy -= 1;
      if (ti.y >  0.3) vy += 1;
      // Feed the stuck watchdog — touch input counts as movement intent.
      if (Math.abs(ti.x) > 0.3 || Math.abs(ti.y) > 0.3) {
        this.lastMovementInputAt = Date.now();
      }
    }
    // Also count keyboard intent so the watchdog picks up keys that
    // are held down (keydown only fires once per press).
    if (vx !== 0 || vy !== 0) this.lastMovementInputAt = Date.now();
    if (vx !== 0 && vy !== 0) {
      const d = Math.SQRT1_2;
      vx *= d;
      vy *= d;
    }
    body.setVelocity(vx * PLAYER_SPEED, vy * PLAYER_SPEED);

    // Update facing direction + sprite frame.
    // Side sprites use flipX instead of separate left/right frames —
    // avoids mirroring issues in the procedural drawing.
    const moving = vx !== 0 || vy !== 0;
    if (vy > 0)      { this.playerFacing = 0; this.player.setFlipX(false); }
    else if (vy < 0) { this.playerFacing = 1; this.player.setFlipX(false); }
    else if (vx < 0) { this.playerFacing = 2; this.player.setFlipX(false); }
    else if (vx > 0) { this.playerFacing = 2; this.player.setFlipX(true); } // mirror left→right

    if (moving) {
      // 2-frame walk cycle: alternate idle↔walk every 180ms
      const walkPhase = Math.floor(Date.now() / 180) % 2;
      this.player.setFrame(walkPhase === 0 ? this.playerFacing : this.playerFacing + 4);
      // Surface-aware footstep SFX (~350ms cadence)
      const now = Date.now();
      if (now - this.lastFootstepAt >= 350) {
        this.lastFootstepAt = now;
        playFootstepForScene(this.scene.key);
      }
    } else {
      this.player.setFrame(this.playerFacing);
    }
  }

  private updatePlayerLabel(): void {
    this.playerNameLabel.setPosition(this.player.x, this.player.y - SPRITE_H / 2 - 4);
  }

  private updateProximityPrompt(): void {
    let best: NearbyTarget | null = null;
    let bestDist = Number.POSITIVE_INFINITY;

    for (const npc of this.npcs) {
      const d = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        npc.sprite.x,
        npc.sprite.y,
      );
      if (d < INTERACT_RADIUS && d < bestDist) {
        best = {
          kind: 'npc',
          ref: npc,
          label: `[E] Speak with ${npc.name}`,
          x: npc.sprite.x,
          y: npc.sprite.y,
          radius: NPC_RADIUS,
        };
        bestDist = d;
      }
    }

    for (const ix of this.interactables) {
      // Skip destroyed sprites (e.g. picked-up loot bags / material nodes).
      if ((ix.sprite as any).active === false) continue;
      const d = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        ix.sprite.x,
        ix.sprite.y,
      );
      if (d < INTERACT_RADIUS + ix.radius && d < bestDist) {
        best = {
          kind: 'interactable',
          ref: ix,
          label: `[E] ${ix.label}`,
          x: ix.sprite.x,
          y: ix.sprite.y,
          radius: ix.radius,
        };
        bestDist = d;
      }
    }

    this.nearbyTarget = best;
    if (best) {
      this.prompt
        .setText(best.label)
        .setPosition(best.x, best.y - best.radius - 24)
        .setVisible(true);
    } else {
      this.prompt.setVisible(false);
    }
  }

  private handleInteraction(): void {
    if (!this.nearbyTarget) return;
    // Skip destroyed interactables.
    if (this.nearbyTarget.kind === 'interactable' &&
        (this.nearbyTarget.ref.sprite as any).active === false) {
      this.nearbyTarget = null;
      this.prompt.setVisible(false);
      return;
    }
    if (!Phaser.Input.Keyboard.JustDown(this.keyE)) return;
    if (this.nearbyTarget.kind === 'npc') {
      try {
        useDialogueStore
          .getState()
          .start(getDialogue(this.nearbyTarget.ref.dialogueId));
      } catch (err) {
        console.warn('Failed to start dialogue:', err);
      }
    } else {
      try {
        this.nearbyTarget.ref.action();
      } catch (err) {
        console.warn('Interactable action failed:', err);
      }
    }
  }

  /** Patrol movement — enemies wander side-to-side near their spawn point. */
  private updateEnemyPatrol(): void {
    const dt = this.game.loop.delta;
    const PATROL_RANGE = 32; // pixels from spawn
    const PATROL_SPEED = 0.3; // pixels per ms

    for (const enemy of this.enemies) {
      enemy.patrolTimer -= dt;
      if (enemy.patrolTimer <= 0) {
        enemy.patrolDir *= -1;
        enemy.patrolTimer = 1500 + Math.random() * 2000;
      }

      const newX = enemy.sprite.x + enemy.patrolDir * PATROL_SPEED * (dt / 16);
      // Clamp to patrol range
      if (Math.abs(newX - enemy.baseX) < PATROL_RANGE) {
        enemy.sprite.x = newX;
      } else {
        enemy.patrolDir *= -1;
      }

      // Slight bobbing on Y axis
      enemy.sprite.y = enemy.baseY + Math.sin(Date.now() * 0.002 + enemy.baseX) * 2;
    }
  }

  private checkTraps(): void {
    const dt = this.game.loop.delta;
    for (const trap of this.traps) {
      trap.cooldown = Math.max(0, trap.cooldown - dt);
      if (trap.cooldown > 0) continue;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, trap.x, trap.y);
      if (dist < 18) {
        trap.cooldown = 2000;
        const char = usePlayerStore.getState().character;
        if (char) {
          char.takeDamage(trap.damage);
          usePlayerStore.getState().notify();
          window.dispatchEvent(new CustomEvent('gameMessage', { detail: `Spike trap! -${trap.damage} HP` }));
          shakeScaled(this, 100, 0.005);
        }
      }
    }
  }

  private updateInvisibleEnemies(): void {
    const now = this.time.now;
    for (let i = this.invisibleEnemies.length - 1; i >= 0; i--) {
      const inv = this.invisibleEnemies[i];
      if (!inv.sprite.active) {
        inv.outline.destroy();
        this.invisibleEnemies.splice(i, 1);
        continue;
      }
      inv.outline.setPosition(inv.sprite.x, inv.sprite.y);
      if (now >= inv.revealedUntil) {
        // Fade back to invisible.
        if (inv.sprite.alpha > 0.08) {
          inv.sprite.setAlpha(Math.max(0.06, inv.sprite.alpha - 0.02));
        }
        inv.outline.setStrokeStyle(2, 0x7fe6ff, 0);
      }
    }
  }

  private checkEnemyContact(): void {
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const dist = Phaser.Math.Distance.Between(
        this.player.x, this.player.y,
        enemy.sprite.x, enemy.sprite.y,
      );
      if (dist < 28) {
        const px = this.player.x;
        const py = this.player.y;
        enemy.sprite.destroy();
        this.enemies.splice(i, 1);
        const currentSceneKey = this.scene.key;

        if (localStorage.getItem('hc_autosave_combat') !== 'false') {
          saveGame('autosave', currentSceneKey);
        }
        const store = useCombatStore.getState();
        store._pendingEnemyId = enemy.id;
        store.start(enemy.monsterKey, currentSceneKey, px, py);
        // Use scene.stop + scene.start so CombatScene.create() runs fresh
        // every fight.  scene.switch only resumes the scene without calling
        // create(), which left stale sprites/state from the previous fight.
        this.scene.stop(this.scene.key);
        this.scene.start('CombatScene');
        return;
      }
    }
  }

  private checkWorldEvents(): void {
    // Only fire in zones that have a name (outdoor/overworld scenes).
    if (!this.getZoneName()) return;

    this.worldEventTimer += this.game.loop.delta;
    if (this.worldEventTimer < this.worldEventCooldown) return;
    this.worldEventTimer = 0;

    // 15% chance per check.
    if (Math.random() > 0.15) return;

    const events = this.getRandomEvents();
    if (events.length === 0) return;
    const event = events[Math.floor(Math.random() * events.length)];
    try { event(); } catch (err) { console.warn('World event error:', err); }
  }

  private checkExits(): void {
    for (const exit of this.exits) {
      const inside =
        this.player.x >= exit.x &&
        this.player.x <= exit.x + exit.w &&
        this.player.y >= exit.y &&
        this.player.y <= exit.y + exit.h;

      // If this exit was suppressed (player spawned in it), clear
      // the suppression once they walk OUT of it. Only then can it trigger.
      if (this.suppressedExit === exit) {
        if (!inside) this.suppressedExit = null; // player left — unsuppress
        continue; // don't trigger this exit yet
      }

      if (inside) {
        this.transitionLock = true;

        // Day/night cycle — advance time on every zone transition.
        useTimeStore.getState().tick();

        // Commission system — advance the zone-transition clock.
        const commStore = useCommissionStore.getState();
        commStore.tick();
        const nowReady = commStore.getReady();
        // Only notify when a commission became ready on THIS tick.
        if (nowReady.some(c => c.readyAtTransition === commStore.transitionCount)) {
          window.dispatchEvent(new CustomEvent('gameMessage', {
            detail: `Kael has finished a commission. Visit the smithy.`,
          }));
        }

        // Leaving the zone — clear killed enemies so they respawn when
        // the player returns.
        useCombatStore.getState().killedEnemies.clear();

        // Clear dungeon checkpoint when leaving a dungeon to a non-dungeon zone.
        if (isDungeonScene(this.scene.key) && !isDungeonScene(exit.targetScene)) {
          useCombatStore.getState().dungeonCheckpoint = null;
        }
        if (localStorage.getItem('hc_autosave_zone') !== 'false') {
          saveGame('autosave', this.scene.key);
        }

        // --- Cinematic loading screen overlay ---
        const cam = this.cameras.main;
        const W = cam.width;
        const H = cam.height;
        const cx = cam.scrollX + W / 2;
        const cy = cam.scrollY + H / 2;

        // Letterbox bars slide in from off-screen.
        const topBar = this.add.rectangle(cx, cam.scrollY - 60, W, 120, 0x000000)
          .setDepth(295);
        const botBar = this.add.rectangle(cx, cam.scrollY + H + 60, W, 120, 0x000000)
          .setDepth(295);
        this.tweens.add({ targets: topBar, y: cam.scrollY + 60, duration: 280, ease: 'Power2' });
        this.tweens.add({ targets: botBar, y: cam.scrollY + H - 60, duration: 280, ease: 'Power2' });

        // Destination name — big Impact-style with P5 red/black shadow.
        const destName = this.add.text(
          cx, cy - 20,
          zoneDisplayName(exit.targetScene).toUpperCase(),
          {
            fontFamily: 'Impact, Arial Black, sans-serif',
            fontSize: '54px',
            color: '#ffffff',
            stroke: '#c81e1e',
            strokeThickness: 6,
            shadow: { offsetX: 4, offsetY: 4, color: '#000000', blur: 0, stroke: true, fill: true },
          },
        ).setOrigin(0.5).setDepth(300).setAlpha(0).setRotation(-0.04);
        this.tweens.add({
          targets: destName,
          alpha: 1, y: cy - 30,
          duration: 400, delay: 200, ease: 'Power2',
        });

        // Random tip during transition.
        const TIPS = [
          'Wizards deal fire damage \u2014 effective against undead.',
          'Rogues strike from shadows \u2014 strong against bandits.',
          'Defend before a heavy attack to reduce damage.',
          'Potions can be used mid-combat with the Item button.',
          'Commission Kael for stronger weapons \u2014 worth the wait.',
          'Waypoint stones allow fast travel between visited zones.',
          'Check the Quest Board for bounties \u2014 repeatable gold and XP.',
          'Spike traps deal more damage on deeper floors.',
          'The Hollow King has two phases. Prepare accordingly.',
          'Companions provide passive bonuses in combat.',
          'Equip crafted gear \u2014 inventory bonuses apply automatically.',
          'Elemental weaknesses deal 50% more damage.',
          'Press Q anywhere to check your active quests.',
          'Antidotes cure poison \u2014 useful against spiders.',
        ];
        const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
        const tipText = this.add.text(cx, cy + 40, tip, {
          fontFamily: 'Courier New, monospace',
          fontSize: '14px',
          color: '#ffd43a',
          fontStyle: 'italic',
          wordWrap: { width: 600 },
          align: 'center',
        }).setOrigin(0.5).setDepth(300).setAlpha(0);
        this.tweens.add({ targets: tipText, alpha: 0.9, duration: 400, delay: 400 });

        // Slim yellow progress bar at the bottom.
        const progressBg = this.add.rectangle(cx, cam.scrollY + H - 80, 400, 4, 0x333333)
          .setDepth(300);
        const progressFill = this.add.rectangle(cx - 200, cam.scrollY + H - 80, 0, 4, 0xffd43a)
          .setOrigin(0, 0.5).setDepth(301);
        this.tweens.add({
          targets: progressFill,
          width: 400,
          duration: 700, ease: 'Sine.easeInOut',
        });
        void progressBg;

        // Hold ~800ms after the bar fills, then fade and start target scene.
        this.time.delayedCall(800, () => {
          cam.fadeOut(FADE_MS, 0, 0, 0);
        });
        cam.once('camerafadeoutcomplete', () => {
          this.scene.start(exit.targetScene, { spawnPoint: exit.targetSpawn });
        });
        return;
      }
    }
  }
}

/** Returns true for dungeon floor scene keys (Depths, Sanctum, BogDungeon). */
function isDungeonScene(key: string): boolean {
  return key.includes('Depths') || key.includes('Floor') || key.includes('Sanctum') || key.includes('BogDungeon') || key.includes('ThroneBeneath') || key.includes('FrozenHollow') || key.includes('ForgottenCave');
}

/**
 * Scene-key to human-readable zone name lookup used by the cinematic
 * loading screen. Mirrors each scene's getZoneName() so we don't need
 * to construct the target scene just to read its label. Falls back to
 * a prettified scene-key when a key is not present in the map.
 */
const ZONE_DISPLAY_NAMES: Record<string, string> = {
  TownScene: 'Ashenvale',
  GreenhollowScene: 'Greenhollow Woods',
  AshenmereScene: 'Ashenmere Marshes',
  AshfieldsScene: 'The Ashfields',
  DuskmereScene: 'Duskmere Village',
  FrosthollowScene: 'Frosthollow Peaks',
  IronveilScene: 'Ironveil Mines',
  MossbarrowScene: 'Mossbarrow Cairn',
  ShatteredCoastScene: 'The Shattered Coast',
  MossbarrowDepthsScene: 'Mossbarrow Depths',
  ForgottenCaveScene: 'The Forgotten Cave',
  DepthsFloor2Scene: 'The Catacombs',
  DepthsFloor3Scene: 'The Hollow Throne',
  DrownedSanctumF1Scene: 'The Drowned Sanctum',
  DrownedSanctumF2Scene: 'The Sanctum Heart',
  BogDungeonF1Scene: 'The Sunken Halls',
  BogDungeonF2Scene: 'The Drowned Gallery',
  BogDungeonF3Scene: "The Warden's Pool",
  AshenTowerF1Scene: 'The Burning Halls',
  AshenTowerF2Scene: 'The Ember Forge',
  AshenTowerF3Scene: 'The Mirror Chamber',
  FrozenHollowF1Scene: 'The Ice Caverns',
  FrozenHollowF2Scene: 'The Frost Vault',
  FrozenHollowF3Scene: 'The Heart of Winter',
  ThroneBeneathF1Scene: 'The Descent',
  ThroneBeneathF2Scene: 'The Hall of Names',
  ThroneBeneathF3Scene: 'The Forgotten Throne',
  InteriorScene: 'Interior',
};

function zoneDisplayName(sceneKey: string): string {
  if (ZONE_DISPLAY_NAMES[sceneKey]) return ZONE_DISPLAY_NAMES[sceneKey];
  // Fallback: strip "Scene" suffix and insert spaces before capitals.
  return sceneKey
    .replace(/Scene$/, '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
}
