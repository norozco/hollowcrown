import * as Phaser from 'phaser';
import { usePlayerStore } from '../state/playerStore';
import { useDialogueStore } from '../state/dialogueStore';
import { getDialogue } from '../engine/dialogues';
import { getNPC } from '../engine/npcs';

/**
 * Ashenvale — the starter town, v0 placeholder pass.
 *
 * No art assets yet; the map is procedurally drawn with rectangles and
 * circles. Real tilesets land in the art pipeline milestone. The layout
 * shown here matches spec §6.1 buildings loosely: Guild (Brenna), Inn,
 * General Store, and an empty plot for the future player house.
 *
 * Interaction model:
 *   - WASD or arrow keys to move
 *   - When near an NPC, a "[E] Speak..." prompt floats above them
 *   - Press E to start their dialogue (handled by dialogueStore)
 *   - Player input freezes while a dialogue is open
 */

interface NpcSprite {
  key: string;
  name: string;
  dialogueId: string;
  sprite: Phaser.GameObjects.Arc;
  nameLabel: Phaser.GameObjects.Text;
}

const TILE = 32;
const WORLD_W = 1280;
const WORLD_H = 720;
const PLAYER_RADIUS = 14;
const NPC_RADIUS = 14;
const PLAYER_SPEED = 190;
const INTERACT_RADIUS = 56;

export class TownScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Arc;
  private playerNameLabel!: Phaser.GameObjects.Text;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyE!: Phaser.Input.Keyboard.Key;

  private walls!: Phaser.Physics.Arcade.StaticGroup;
  private npcs: NpcSprite[] = [];
  private prompt!: Phaser.GameObjects.Text;
  private nearbyNpc: NpcSprite | null = null;

  constructor() {
    super({ key: 'TownScene' });
  }

  create(): void {
    // Reset per-scene state (in case scene restarts for a new character)
    this.npcs = [];
    this.nearbyNpc = null;

    this.drawGround();
    this.createWorldBounds();
    this.drawBuildings();
    this.createPlayer();
    this.createNpcs();
    this.setupInput();
    this.createPrompt();

    // Camera fixed to the world bounds for v0 (map == viewport).
    this.cameras.main.setBounds(0, 0, WORLD_W, WORLD_H);
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
  }

  update(): void {
    // Freeze gameplay while a dialogue is open.
    if (useDialogueStore.getState().dialogue) {
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(0, 0);
      this.prompt.setVisible(false);
      return;
    }

    this.handleMovement();
    this.updatePlayerLabel();
    this.updateProximityPrompt();
    this.handleInteraction();
  }

  // ──────────────────────────────────────────────────────────────
  // Layout helpers
  // ──────────────────────────────────────────────────────────────

  private drawGround(): void {
    // Dark mossy green for grass; lighter strips for worn paths.
    this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, WORLD_H, 0x1a2418);

    // A rough horizontal path running through the center of town.
    this.add.rectangle(WORLD_W / 2, WORLD_H / 2, WORLD_W, TILE * 3, 0x3a2f1e).setAlpha(0.5);
  }

  private createWorldBounds(): void {
    this.walls = this.physics.add.staticGroup();

    // Invisible thin walls at each world edge keep the player inside.
    const edges = [
      { x: WORLD_W / 2, y: -4, w: WORLD_W, h: 8 }, // top
      { x: WORLD_W / 2, y: WORLD_H + 4, w: WORLD_W, h: 8 }, // bottom
      { x: -4, y: WORLD_H / 2, w: 8, h: WORLD_H }, // left
      { x: WORLD_W + 4, y: WORLD_H / 2, w: 8, h: WORLD_H }, // right
    ];
    for (const e of edges) {
      const edge = this.add.rectangle(e.x, e.y, e.w, e.h, 0x000000).setVisible(false);
      this.physics.add.existing(edge, true);
      this.walls.add(edge);
    }
  }

  private drawBuildings(): void {
    // Each building is a rectangle with a darker doorway rectangle in front.
    const buildings: {
      x: number;
      y: number;
      w: number;
      h: number;
      color: number;
      label: string;
    }[] = [
      { x: 7 * TILE, y: 5 * TILE, w: 6 * TILE, h: 4 * TILE, color: 0x4a2e1a, label: "Adventurers' Guild" },
      { x: 17 * TILE, y: 5 * TILE, w: 6 * TILE, h: 4 * TILE, color: 0x3a2a30, label: 'Whispering Hollow Inn' },
      { x: 28 * TILE, y: 5 * TILE, w: 5 * TILE, h: 3 * TILE, color: 0x3a3420, label: 'General Store' },
    ];

    for (const b of buildings) {
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      const rect = this.add.rectangle(cx, cy, b.w, b.h, b.color);
      rect.setStrokeStyle(2, 0x2a1810);
      this.physics.add.existing(rect, true);
      this.walls.add(rect);

      // Label above the building — small chalk-mark text.
      this.add
        .text(cx, b.y - 10, b.label, {
          fontFamily: 'Courier New',
          fontSize: '13px',
          color: '#8a7a48',
        })
        .setOrigin(0.5, 1);

      // Doorway — a darker slot at the bottom center of the building.
      this.add.rectangle(cx, b.y + b.h - 4, TILE, 8, 0x1a0e08).setOrigin(0.5, 0.5);
    }

    // Empty plot ("[Available: 500g]" in spec §6.1) — stubbed here.
    const plotX = 10 * TILE;
    const plotY = 13 * TILE;
    const plotW = 5 * TILE;
    const plotH = 3 * TILE;
    this.add
      .rectangle(plotX + plotW / 2, plotY + plotH / 2, plotW, plotH, 0x2a2418)
      .setStrokeStyle(1, 0x3a2818);
    this.add
      .text(plotX + plotW / 2, plotY + plotH / 2, '[ Empty Plot ]', {
        fontFamily: 'Courier New',
        fontSize: '12px',
        color: '#5a4828',
      })
      .setOrigin(0.5);
  }

  private createPlayer(): void {
    const character = usePlayerStore.getState().character;
    const color = 0xd4a968;

    // Spawn in the south-center of town.
    const spawnX = WORLD_W / 2;
    const spawnY = 16 * TILE;
    this.player = this.add.circle(spawnX, spawnY, PLAYER_RADIUS, color);
    this.player.setStrokeStyle(2, 0x1a0e08);
    this.physics.add.existing(this.player);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setCircle(PLAYER_RADIUS);
    body.setCollideWorldBounds(true);

    // Collide with buildings + world edges.
    this.physics.add.collider(this.player, this.walls);

    // Player nameplate floats above the circle.
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

  private createNpcs(): void {
    // Brenna stands just in front of the Guild door.
    this.spawnNpc({
      key: 'brenna',
      dialogueId: 'guild-greeting',
      x: 10 * TILE,
      y: 10 * TILE,
    });
    // Tomas stands in front of the Inn.
    this.spawnNpc({
      key: 'tomas',
      dialogueId: 'tomas-greeting',
      x: 20 * TILE,
      y: 10 * TILE,
    });
    // Vira stands in front of the General Store.
    this.spawnNpc({
      key: 'vira',
      dialogueId: 'vira-greeting',
      x: 30 * TILE,
      y: 9 * TILE,
    });
  }

  private spawnNpc(cfg: { key: string; dialogueId: string; x: number; y: number }): void {
    const data = getNPC(cfg.key);
    if (!data) {
      console.warn(`TownScene: unknown NPC "${cfg.key}", skipping`);
      return;
    }
    const color = parseInt(data.portraitColor.replace('#', ''), 16);
    const sprite = this.add.circle(cfg.x, cfg.y, NPC_RADIUS, color);
    sprite.setStrokeStyle(2, 0x1a0e08);
    this.physics.add.existing(sprite, true);
    this.walls.add(sprite); // so the player can't walk through NPCs

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

  // ──────────────────────────────────────────────────────────────
  // Per-frame logic
  // ──────────────────────────────────────────────────────────────

  private handleMovement(): void {
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    let vx = 0;
    let vy = 0;
    if (this.cursors.left?.isDown || this.keyA.isDown) vx -= 1;
    if (this.cursors.right?.isDown || this.keyD.isDown) vx += 1;
    if (this.cursors.up?.isDown || this.keyW.isDown) vy -= 1;
    if (this.cursors.down?.isDown || this.keyS.isDown) vy += 1;
    // Normalize diagonal speed.
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
        const dlg = getDialogue(this.nearbyNpc.dialogueId);
        useDialogueStore.getState().start(dlg);
      } catch (err) {
        console.warn('Failed to start dialogue:', err);
      }
    }
  }
}
