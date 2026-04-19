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

export abstract class BaseWorldScene extends Phaser.Scene {
  protected player!: Phaser.GameObjects.Sprite;
  protected playerNameLabel!: Phaser.GameObjects.Text;
  private playerFacing = 0; // 0=down, 1=up, 2=left, 3=right
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

  /** Guards against re-entering checkExits during a transition. */
  private transitionLock = false;

  // ── World event system ──
  private worldEventTimer = 0;
  private readonly worldEventCooldown = 30000; // 30 s between checks
  /** Brief immunity after returning from combat — prevents instant re-engage on flee. */
  private combatImmunity = 0;
  /** Exit zone the player spawned inside — suppressed until they walk out of it. */
  private suppressedExit: Exit | null = null;

  // ── Dark room system (Lantern dungeon item) ──
  private darkRT: Phaser.GameObjects.RenderTexture | null = null;
  private darkBrush: Phaser.GameObjects.Graphics | null = null;
  private isDarkRoom = false;

  // ──────────────────────────────────────────────────────────────
  // Subclass hooks
  // ──────────────────────────────────────────────────────────────

  /** Paint ground, buildings/trees, spawn NPCs, register exits. */
  protected abstract layout(): void;

  /** Resolve a named spawn point (e.g. "default", "fromGreenhollow"). */
  protected abstract spawnAt(name: string): { x: number; y: number };

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
    this.nearbyTarget = null;
    this.transitionLock = false;
    this.combatImmunity = 0;
    this.suppressedExit = null;

    this.walls = this.physics.add.staticGroup();
    this.createWorldBounds();
    this.layout();

    // If returning from combat, use the saved position instead of a named spawn.
    let spawn: { x: number; y: number };
    if (data?.spawnPoint === 'combat_return' && data.combatReturnX && data.combatReturnY) {
      spawn = { x: data.combatReturnX, y: data.combatReturnY };
      // Grant brief immunity so the player isn't instantly re-engaged
      // (especially after fleeing — enemy respawns at the same spot).
      this.combatImmunity = 1200; // ms
    } else {
      spawn = this.spawnAt(data?.spawnPoint ?? 'default');
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

    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.fadeIn(FADE_MS, 0, 0, 0);

    // Dark room — if the scene is marked dark and the player lacks the Lantern,
    // create a RenderTexture overlay and a brush to erase a circle of light.
    if (this.isDarkRoom && !useDungeonItemStore.getState().has('lantern')) {
      this.darkRT = this.add.renderTexture(0, 0, WORLD_W, WORLD_H).setDepth(100);
      this.darkBrush = this.make.graphics({});
      this.darkBrush.fillStyle(0xffffff);
      this.darkBrush.fillCircle(64, 64, 64);
    }

    // Record zone visit for achievements.
    useAchievementStore.getState().recordZoneVisit(this.scene.key);

    // Dungeon checkpoint — auto-save the floor as a respawn point on death.
    if (isDungeonScene(this.scene.key)) {
      useCombatStore.getState().dungeonCheckpoint = { sceneKey: this.scene.key, spawn: 'default' };
    }

    // Expose map data for the React minimap overlay.
    (window as any).__currentMap = {
      zoneName: this.getZoneName(),
      playerX: spawn.x,
      playerY: spawn.y,
      worldW: WORLD_W,
      worldH: WORLD_H,
      exits: this.exits.map((e) => ({ x: e.x + e.w / 2, y: e.y + e.h / 2 })),
      enemies: this.enemies.map((e) => ({ x: e.sprite.x, y: e.sprite.y })),
    };

    // Zone name reveal (Souls-style)
    const zoneName = this.getZoneName();
    if (zoneName) {
      const zoneText = this.add.text(WORLD_W / 2, WORLD_H / 2 - 40, zoneName, {
        fontFamily: 'Courier New', fontSize: '28px', color: '#d4a968',
        stroke: '#000000', strokeThickness: 4,
      }).setOrigin(0.5).setDepth(200).setAlpha(0);

      this.tweens.add({
        targets: zoneText,
        alpha: { from: 0, to: 1 },
        duration: 800,
        hold: 2000,
        yoyo: true,
        onComplete: () => zoneText.destroy(),
      });
    }
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
    // Keep minimap player position current.
    if ((window as any).__currentMap) {
      (window as any).__currentMap.playerX = this.player.x;
      (window as any).__currentMap.playerY = this.player.y;
      (window as any).__currentMap.enemies = this.enemies.map((e) => ({ x: e.sprite.x, y: e.sprite.y }));
    }
    this.checkTraps();
    this.updatePlayerLabel();
    this.updateProximityPrompt();
    this.handleInteraction();
    this.updateEnemyPatrol();
    if (this.combatImmunity <= 0) this.checkEnemyContact();
    this.checkExits();
    this.checkWorldEvents();

    // Dark room overlay — erase a circle of light around the player each frame.
    if (this.darkRT && this.darkBrush) {
      this.darkRT.clear();
      this.darkRT.fill(0x000000, 0.92);
      this.darkRT.erase(this.darkBrush, this.player.x - 64, this.player.y - 64);
    }
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
   * HP and MP on interaction. One use per zone visit.
   */
  protected spawnFairyFountain(cfg: { x: number; y: number }): void {
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

  /** Spawn a locked door that requires a key item to open. */
  protected spawnLockedDoor(cfg: {
    x: number; y: number; w: number; h: number;
    keyItem: string; label?: string;
  }): void {
    const door = this.add.rectangle(cfg.x + cfg.w/2, cfg.y + cfg.h/2, cfg.w, cfg.h, 0x6a5030);
    door.setStrokeStyle(2, 0x8a7040);
    door.setDepth(8);
    // Lock icon
    const lock = this.add.circle(cfg.x + cfg.w/2, cfg.y + cfg.h/2, 6, 0xc0a040);
    lock.setDepth(9);
    // Collision
    this.physics.add.existing(door, true);
    this.walls.add(door);

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
          const body = door.body as Phaser.Physics.Arcade.StaticBody;
          if (body) body.destroy();
          window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Door unlocked.' }));
        } else {
          window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'Locked. You need a key.' }));
        }
      },
    });
  }

  /** Spawn a treasure chest with guaranteed loot. One-time per visit. */
  protected spawnChest(cfg: {
    x: number; y: number;
    loot: Array<{ itemKey: string; qty?: number }>;
    gold?: number;
  }): void {
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
        chest.destroy();
        lid.destroy();
        clasp.destroy();
      },
    });
  }

  /**
   * Spawn a shallow water barrier — a translucent water-like area that
   * blocks the player UNLESS they have the Water Charm dungeon item.
   * Used for optional shortcuts and hidden areas.
   */
  protected spawnShallowWater(cfg: { x: number; y: number; w: number; h: number }): void {
    if (useDungeonItemStore.getState().has('water_charm')) return; // passable
    const barrier = this.add.rectangle(
      cfg.x + cfg.w / 2, cfg.y + cfg.h / 2, cfg.w, cfg.h, 0x4080b0, 0.3);
    barrier.setDepth(3);
    this.physics.add.existing(barrier, true);
    this.walls.add(barrier);
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
        this.cameras.main.shake(200, 0.008);
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'The wall crumbles!' }));
        this.spawnPickupParticles(cfg.x + cfg.w / 2, cfg.y + cfg.h / 2, 0x808070);
        cfg.onBreak?.();
      },
    });
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
        this.cameras.main.shake(150, 0.006);
        window.dispatchEvent(new CustomEvent('gameMessage', { detail: 'The ice melts away.' }));
        this.spawnPickupParticles(cfg.x + cfg.w / 2, cfg.y + cfg.h / 2, 0x80c0e0);
        cfg.onMelt?.();
      },
    });
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

    this.enemies.push({
      sprite: enemy, monsterKey: cfg.monsterKey, id: enemyId,
      baseX: finalX, baseY: finalY,
      patrolDir: Math.random() > 0.5 ? 1 : -1,
      patrolTimer: Math.random() * 3000,
    });
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
      if (window.__touchInput.x < -0.3) vx -= 1;
      if (window.__touchInput.x >  0.3) vx += 1;
      if (window.__touchInput.y < -0.3) vy -= 1;
      if (window.__touchInput.y >  0.3) vy += 1;
    }
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
          this.cameras.main.shake(100, 0.005);
        }
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

        saveGame('autosave', currentSceneKey);
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
        saveGame('autosave', this.scene.key);

        // Show destination zone name briefly during the fade-out.
        const destText = this.add.text(
          WORLD_W / 2, WORLD_H / 2,
          exit.targetScene.replace('Scene', ''),
          {
            fontFamily: 'Courier New', fontSize: '18px', color: '#d4a968',
            stroke: '#000000', strokeThickness: 3,
          },
        ).setOrigin(0.5).setDepth(300).setAlpha(0);
        this.tweens.add({ targets: destText, alpha: 0.7, duration: 200 });

        // Show a random tip during transition.
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
        const tipText = this.add.text(WORLD_W / 2, WORLD_H / 2 + 30, tip, {
          fontFamily: 'Courier New', fontSize: '11px', color: '#8a7a48',
          stroke: '#000000', strokeThickness: 2,
          wordWrap: { width: 400 },
        }).setOrigin(0.5).setDepth(300).setAlpha(0);
        this.tweens.add({ targets: tipText, alpha: 0.8, duration: 300 });

        this.cameras.main.fadeOut(FADE_MS, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
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
