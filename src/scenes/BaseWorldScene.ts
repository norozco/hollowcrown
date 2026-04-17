import * as Phaser from 'phaser';
import { usePlayerStore } from '../state/playerStore';
import { useDialogueStore } from '../state/dialogueStore';
import { useCombatStore } from '../state/combatStore';
import { getDialogue } from '../engine/dialogues';
import { getNPC } from '../engine/npcs';
import {
  generateCharacterSprite,
  getNpcPalette,
  getNpcEquip,
  getNpcRace,
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
  protected enemies: Array<{ sprite: Phaser.GameObjects.Arc | Phaser.GameObjects.Sprite; monsterKey: string; id: string }> = [];
  protected exits: Exit[] = [];
  protected prompt!: Phaser.GameObjects.Text;
  protected nearbyTarget: NearbyTarget | null = null;

  /** Guards against re-entering checkExits during a transition. */
  private transitionLock = false;

  // ──────────────────────────────────────────────────────────────
  // Subclass hooks
  // ──────────────────────────────────────────────────────────────

  /** Paint ground, buildings/trees, spawn NPCs, register exits. */
  protected abstract layout(): void;

  /** Resolve a named spawn point (e.g. "default", "fromGreenhollow"). */
  protected abstract spawnAt(name: string): { x: number; y: number };

  // ──────────────────────────────────────────────────────────────
  // Phaser lifecycle
  // ──────────────────────────────────────────────────────────────

  create(data?: WorldSceneInit & { combatReturnX?: number; combatReturnY?: number }): void {
    this.npcs = [];
    this.interactables = [];
    this.enemies = [];
    this.exits = [];
    this.nearbyTarget = null;
    this.transitionLock = false;

    this.walls = this.physics.add.staticGroup();
    this.createWorldBounds();
    this.layout();

    // If returning from combat, use the saved position instead of a named spawn.
    let spawn: { x: number; y: number };
    if (data?.spawnPoint === 'combat_return' && data.combatReturnX && data.combatReturnY) {
      spawn = { x: data.combatReturnX, y: data.combatReturnY };
    } else {
      spawn = this.spawnAt(data?.spawnPoint ?? 'default');
    }
    this.createPlayer(spawn.x, spawn.y);

    this.setupInput();
    this.createPrompt();

    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.cameras.main.fadeIn(FADE_MS, 0, 0, 0);
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

    this.handleMovement();
    this.updatePlayerLabel();
    this.updateProximityPrompt();
    this.handleInteraction();
    this.checkEnemyContact();
    this.checkExits();
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

  /** Spawn an enemy that triggers combat on contact. Skips if already killed. */
  protected spawnEnemy(cfg: { monsterKey: string; x: number; y: number; color?: number }): void {
    // Check if this enemy was already killed this session.
    const enemyId = `${this.scene.key}-${cfg.x}-${cfg.y}`;
    if (useCombatStore.getState().killedEnemies.has(enemyId)) return;

    // Use the monster sprite instead of a colored circle.
    const spriteKey = `world-${cfg.monsterKey}-${cfg.x}-${cfg.y}`;
    generateMonsterSprite(this, spriteKey, cfg.monsterKey);

    const enemy = this.add.sprite(cfg.x, cfg.y, spriteKey, 0);
    enemy.setScale(0.8); // smaller in the overworld than in combat
    enemy.setDepth(10);
    this.enemies.push({ sprite: enemy, monsterKey: cfg.monsterKey, id: enemyId });
  }

  /** Spawn an NPC sprite at tile coords, with name floating above. */
  protected spawnNpc(cfg: { key: string; dialogueId: string; x: number; y: number }): void {
    const data = getNPC(cfg.key);
    if (!data) {
      console.warn(`scene: unknown NPC "${cfg.key}", skipping`);
      return;
    }

    // Generate a unique sprite with this NPC's palette + their own equipment.
    const spriteKey = `npc-${cfg.key}`;
    const npcRace = getNpcRace(cfg.key);
    const npcEquip = getNpcEquip(cfg.key);
    generateCharacterSprite(this, spriteKey, getNpcPalette(cfg.key, data.portraitColor), npcRace, 'fighter', npcEquip);

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
    const colors = playerPalette(raceKey, classKey, character?.playerChoice ?? undefined);
    generateCharacterSprite(this, 'player-sprite', colors, raceKey, classKey);

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

    const frame = moving ? this.playerFacing + 4 : this.playerFacing;
    this.player.setFrame(frame);
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

        const store = useCombatStore.getState();
        // Store the enemy ID — only marked killed on victory in finish().
        store._pendingEnemyId = enemy.id;
        store.start(enemy.monsterKey, currentSceneKey, px, py);
        this.scene.switch('CombatScene');
        return;
      }
    }
  }

  private checkExits(): void {
    for (const exit of this.exits) {
      // Simple bounding-box check — player center inside exit rect.
      if (
        this.player.x >= exit.x &&
        this.player.x <= exit.x + exit.w &&
        this.player.y >= exit.y &&
        this.player.y <= exit.y + exit.h
      ) {
        this.transitionLock = true;
        this.cameras.main.fadeOut(FADE_MS, 0, 0, 0);
        this.cameras.main.once('camerafadeoutcomplete', () => {
          this.scene.start(exit.targetScene, { spawnPoint: exit.targetSpawn });
        });
        return;
      }
    }
  }
}
