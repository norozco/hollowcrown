import * as Phaser from 'phaser';
import { usePlayerStore } from '../state/playerStore';
import { useDialogueStore } from '../state/dialogueStore';
import { getDialogue } from '../engine/dialogues';
import { getNPC } from '../engine/npcs';

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
  sprite: Phaser.GameObjects.Arc;
  nameLabel: Phaser.GameObjects.Text;
}

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

const PLAYER_RADIUS = 14;
const NPC_RADIUS = 14;
const PLAYER_SPEED = 190;
const INTERACT_RADIUS = 56;
const FADE_MS = 250;

export abstract class BaseWorldScene extends Phaser.Scene {
  protected player!: Phaser.GameObjects.Arc;
  protected playerNameLabel!: Phaser.GameObjects.Text;
  protected cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  protected keyW!: Phaser.Input.Keyboard.Key;
  protected keyA!: Phaser.Input.Keyboard.Key;
  protected keyS!: Phaser.Input.Keyboard.Key;
  protected keyD!: Phaser.Input.Keyboard.Key;
  protected keyE!: Phaser.Input.Keyboard.Key;

  protected walls!: Phaser.Physics.Arcade.StaticGroup;
  protected npcs: NpcSprite[] = [];
  protected exits: Exit[] = [];
  protected prompt!: Phaser.GameObjects.Text;
  protected nearbyNpc: NpcSprite | null = null;

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

  create(data?: WorldSceneInit): void {
    this.npcs = [];
    this.exits = [];
    this.nearbyNpc = null;
    this.transitionLock = false;

    this.walls = this.physics.add.staticGroup();
    this.createWorldBounds();
    this.layout();

    const spawn = this.spawnAt(data?.spawnPoint ?? 'default');
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
    if (useDialogueStore.getState().dialogue) {
      (this.player.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
      this.prompt.setVisible(false);
      return;
    }

    this.handleMovement();
    this.updatePlayerLabel();
    this.updateProximityPrompt();
    this.handleInteraction();
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

  /** Spawn an NPC circle at tile coords, with name floating above. */
  protected spawnNpc(cfg: { key: string; dialogueId: string; x: number; y: number }): void {
    const data = getNPC(cfg.key);
    if (!data) {
      console.warn(`scene: unknown NPC "${cfg.key}", skipping`);
      return;
    }
    const color = parseInt(data.portraitColor.replace('#', ''), 16);
    const sprite = this.add.circle(cfg.x, cfg.y, NPC_RADIUS, color);
    sprite.setStrokeStyle(2, 0x1a0e08);
    this.physics.add.existing(sprite, true);
    this.walls.add(sprite);

    const nameLabel = this.add
      .text(cfg.x, cfg.y - NPC_RADIUS - 10, data.name, {
        fontFamily: 'Courier New',
        fontSize: '12px',
        color: '#d4a968',
        backgroundColor: 'rgba(10,6,6,0.65)',
        padding: { x: 4, y: 1 },
      })
      .setOrigin(0.5, 1);

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
          fontSize: '14px',
          color: '#d4a968',
          backgroundColor: 'rgba(10,6,6,0.6)',
          padding: { x: 6, y: 3 },
        })
        .setOrigin(0.5)
        .setAlpha(0.85);
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
    this.player = this.add.circle(spawnX, spawnY, PLAYER_RADIUS, 0xd4a968);
    this.player.setStrokeStyle(2, 0x1a0e08);
    this.physics.add.existing(this.player);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setCircle(PLAYER_RADIUS);
    body.setCollideWorldBounds(true);
    this.physics.add.collider(this.player, this.walls);

    this.playerNameLabel = this.add
      .text(spawnX, spawnY - PLAYER_RADIUS - 10, character?.name ?? '???', {
        fontFamily: 'Courier New',
        fontSize: '12px',
        color: '#f4d488',
        backgroundColor: 'rgba(10,6,6,0.65)',
        padding: { x: 4, y: 1 },
      })
      .setOrigin(0.5, 1);
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
  }

  private updatePlayerLabel(): void {
    this.playerNameLabel.setPosition(this.player.x, this.player.y - PLAYER_RADIUS - 10);
  }

  private updateProximityPrompt(): void {
    let closest: NpcSprite | null = null;
    let closestDist = INTERACT_RADIUS;
    for (const npc of this.npcs) {
      const d = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        npc.sprite.x,
        npc.sprite.y,
      );
      if (d < closestDist) {
        closest = npc;
        closestDist = d;
      }
    }
    this.nearbyNpc = closest;
    if (closest) {
      this.prompt
        .setText(`[E] Speak with ${closest.name}`)
        .setPosition(closest.sprite.x, closest.sprite.y - NPC_RADIUS - 24)
        .setVisible(true);
    } else {
      this.prompt.setVisible(false);
    }
  }

  private handleInteraction(): void {
    if (this.nearbyNpc && Phaser.Input.Keyboard.JustDown(this.keyE)) {
      try {
        useDialogueStore.getState().start(getDialogue(this.nearbyNpc.dialogueId));
      } catch (err) {
        console.warn('Failed to start dialogue:', err);
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
